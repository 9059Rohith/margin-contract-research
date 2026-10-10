import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { env } from '@/lib/env';
import { AppError,errorResponse } from '@/lib/errors';
import { guardMutation } from '@/lib/security/request';

export const runtime='nodejs';
const allowed=/^documents\/[0-9a-f-]{36}\.(pdf|docx)$/i;

export async function POST(request:Request){
  try{
    if(!process.env.VERCEL)throw new AppError('invalid_request',400,'Direct upload is only available on the deployed site.');
    const body=await request.json() as HandleUploadBody;
    if(body.type==='blob.generate-client-token')guardMutation(request,'blob_token');
    const response=await handleUpload({body,request,onBeforeGenerateToken:async pathname=>{
      if(!allowed.test(pathname))throw new AppError('invalid_request',400,'Only PDF and DOCX contracts are supported.');
      return {allowedContentTypes:['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],maximumSizeInBytes:env.MAX_UPLOAD_MB*1024*1024,addRandomSuffix:true,allowOverwrite:false};
    },onUploadCompleted:async()=>{}});
    return Response.json(response);
  }catch(error){return errorResponse(error);}
}
