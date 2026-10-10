import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { db, repo } from '@/lib/db';
import { env } from '@/lib/env';
import { AppError, errorResponse } from '@/lib/errors';
import { queueDocument, sniffFile } from '@/lib/extract';
import { guardMutation } from '@/lib/security/request';

export const runtime='nodejs';
export async function GET(){const documents=repo.listDocuments();for(const doc of documents)if(['queued','extracting','indexing'].includes(doc.status))queueDocument(doc.id);return Response.json({documents:documents.map(doc=>({...doc,source_path:undefined}))});}
export async function POST(request:Request){
  try{
    guardMutation(request,'upload');
    const form=await request.formData();
    const file=form.get('file');
    if(!(file instanceof File))throw new AppError('missing_file',400,'Choose a PDF or DOCX file.');
    if(file.size>env.MAX_UPLOAD_MB*1024*1024)throw new AppError('too_large',413,`Files must be under ${env.MAX_UPLOAD_MB} MB.`);
    const buffer=Buffer.from(await file.arrayBuffer());
    const type=await sniffFile(buffer,file.name);
    const hash=crypto.createHash('sha256').update(buffer).digest('hex');
    const duplicate=repo.listDocuments().find(d=>d.sha256===hash&&d.status==='ready');
    if(duplicate)return Response.json({document:{...duplicate,source_path:undefined},duplicate:true});
    const id=crypto.randomUUID(),now=new Date().toISOString();
    const name=path.basename(file.name).replace(/[<>"\x00-\x1f]/g,'').slice(0,180)||'Untitled document';
    const filePath=path.resolve(env.DATA_DIR,'files',id+(type==='pdf'?'.pdf':'.docx'));
    await fs.mkdir(path.dirname(filePath),{recursive:true});
    await fs.writeFile(filePath,buffer);
    db.prepare('INSERT INTO documents(id,name,mime,size_bytes,sha256,status,source_path,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,name,type==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer.length,hash,'queued',filePath,now,now);
    queueDocument(id);
    return Response.json({document:{...repo.getDocument(id),source_path:undefined},duplicate:false},{status:202});
  }catch(error){return errorResponse(error);}
}
