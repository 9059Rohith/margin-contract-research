import { repo } from '@/lib/db';
import { env } from '@/lib/env';
import { AppError, errorResponse } from '@/lib/errors';
import { guardMutation } from '@/lib/security/request';
import { registerDocument } from '@/lib/documents';
import { scheduleProcessing } from '@/lib/jobs';

export const runtime='nodejs';
export const maxDuration=300;
export async function GET(){const documents=await repo.listDocuments();const now=new Date().toISOString();for(const doc of documents)if(doc.status==='queued'||(['extracting','indexing'].includes(doc.status)&&(!doc.lease_until||doc.lease_until<now)))scheduleProcessing(doc.id);return Response.json({documents:documents.map(doc=>({...doc,source_path:undefined,lease_until:undefined}))});}
export async function POST(request:Request){
  try{
    guardMutation(request,'upload');
    const form=await request.formData();
    const file=form.get('file');
    if(!(file instanceof File))throw new AppError('missing_file',400,'Choose a PDF or DOCX file.');
    if(file.size>env.MAX_UPLOAD_MB*1024*1024)throw new AppError('too_large',413,`Files must be under ${env.MAX_UPLOAD_MB} MB.`);
    const buffer=Buffer.from(await file.arrayBuffer());
    const result=await registerDocument(buffer,file.name);
    if(!result.duplicate&&result.document?.id)scheduleProcessing(result.document.id);
    return Response.json(result,{status:result.duplicate?200:202});
  }catch(error){return errorResponse(error);}
}
