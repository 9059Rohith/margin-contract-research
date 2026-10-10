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

export async function removeStoredFile(location:string):Promise<void> {
  try {
    if (/^https:\/\//.test(location))await del(location);
    else await fs.unlink(location);
  } catch { /* The database record is already removed; an absent file is harmless. */ }
}
