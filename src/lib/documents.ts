import crypto from 'node:crypto';
import path from 'node:path';
import { db,repo } from '@/lib/db';
import { sniffFile } from '@/lib/extract';
import { removeStoredFile,storeUploadedFile } from '@/lib/storage';

export async function registerDocument(buffer:Buffer,filename:string,preUploadedUrl?:string){
  const type=await sniffFile(buffer,filename);
  const hash=crypto.createHash('sha256').update(buffer).digest('hex');
  const duplicate=(await repo.listDocuments()).find(d=>d.sha256===hash&&d.status==='ready');
  if(duplicate){if(preUploadedUrl)await removeStoredFile(preUploadedUrl);return {document:{...duplicate,source_path:undefined,lease_until:undefined},duplicate:true};}
  const id=crypto.randomUUID(),now=new Date().toISOString();
  const name=path.basename(filename).replace(/[<>"\x00-\x1f]/g,'').slice(0,180)||'Untitled document';
  const mime=type==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const location=preUploadedUrl??await storeUploadedFile(id,type,buffer,mime);
  try{
    await db.prepare('INSERT INTO documents(id,name,mime,size_bytes,sha256,status,source_path,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,name,mime,buffer.length,hash,'queued',location,now,now);
  }catch(error){await removeStoredFile(location);throw error;}
  return {document:{...await repo.getDocument(id),source_path:undefined,lease_until:undefined},duplicate:false};
}
