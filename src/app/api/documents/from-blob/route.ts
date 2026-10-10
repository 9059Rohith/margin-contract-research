import { head } from '@vercel/blob';
import { z } from 'zod';
import { env } from '@/lib/env';
import { AppError,errorResponse } from '@/lib/errors';
import { guardMutation } from '@/lib/security/request';
import { readStoredFile,removeStoredFile } from '@/lib/storage';
import { registerDocument } from '@/lib/documents';
import { scheduleProcessing } from '@/lib/jobs';

export const runtime='nodejs';
export const maxDuration=300;
const schema=z.object({url:z.string().url(),name:z.string().min(1).max(255)});

export async function POST(request:Request){
  let uploadedUrl:string|undefined;
  try{
    guardMutation(request,'blob_token');
    const parsed=schema.safeParse(await request.json());
    if(!parsed.success)throw new AppError('invalid_request',400,'Invalid uploaded document.');
    const {url,name}=parsed.data;
    const location=new URL(url);
    if(location.protocol!=='https:'||!location.hostname.endsWith('.private.blob.vercel-storage.com')||!/^\/documents\/[0-9a-f-]{36}(?:-[a-z0-9]+)?\.(pdf|docx)$/i.test(location.pathname))throw new AppError('invalid_request',400,'Unrecognized private upload.');
    uploadedUrl=url;
    const metadata=await head(url);
    if(metadata.size>env.MAX_UPLOAD_MB*1024*1024)throw new AppError('too_large',413,`Files must be under ${env.MAX_UPLOAD_MB} MB.`);
    const buffer=await readStoredFile(url);
    if(buffer.length!==metadata.size)throw new AppError('corrupt',422,'The uploaded file could not be read completely.');
    const result=await registerDocument(buffer,name,url);
    uploadedUrl=undefined;
    if(!result.duplicate&&result.document?.id)scheduleProcessing(result.document.id);
    return Response.json(result,{status:result.duplicate?200:202});
  }catch(error){if(uploadedUrl)await removeStoredFile(uploadedUrl);return errorResponse(error);}
}
