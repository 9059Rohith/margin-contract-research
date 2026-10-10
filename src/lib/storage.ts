import fs from 'node:fs/promises';
import path from 'node:path';
import { del, get, put } from '@vercel/blob';
import { env } from '@/lib/env';

export async function storeUploadedFile(id:string,extension:'pdf'|'docx',buffer:Buffer,mime:string):Promise<string> {
  if (process.env.VERCEL) {
    const blob=await put(`documents/${id}.${extension}`,buffer,{access:'private',contentType:mime,addRandomSuffix:false});
    return blob.url;
  }
  const filePath=path.resolve(env.DATA_DIR,'files',`${id}.${extension}`);
  await fs.mkdir(path.dirname(filePath),{recursive:true});
  await fs.writeFile(filePath,buffer);
  return filePath;
}

export async function readStoredFile(location:string):Promise<Buffer> {
  if (/^https:\/\//.test(location)) {
    const result=await get(location,{access:'private'});
    if(result?.statusCode!==200)throw new Error('Stored document is unavailable.');
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
  return fs.readFile(location);
}

export async function readStoredFileRange(location:string,start:number,end:number):Promise<Buffer> {
  if (/^https:\/\//.test(location)) {
    const result=await get(location,{access:'private',headers:{Range:`bytes=${start}-${end}`}});
    if(result?.statusCode!==200)throw new Error('Stored document is unavailable.');
    const bytes=Buffer.from(await new Response(result.stream).arrayBuffer());
    return result.headers.has('content-range') ? bytes : bytes.subarray(start,end+1);
  }
  const file=await fs.open(location,'r');
  try {
    const bytes=Buffer.alloc(end-start+1);
    let done=0;
    while(done<bytes.length){
      const result=await file.read(bytes,done,bytes.length-done,start+done);
      if(!result.bytesRead)throw new Error('Stored document ended unexpectedly.');
      done+=result.bytesRead;
    }
    return bytes;
  } finally { await file.close(); }
}

export async function removeStoredFile(location:string):Promise<void> {
  try {
    if (/^https:\/\//.test(location))await del(location);
    else await fs.unlink(location);
  } catch { /* The database record is already removed; an absent file is harmless. */ }
}
