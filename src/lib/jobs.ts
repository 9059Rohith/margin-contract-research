import { waitUntil } from '@vercel/functions';
import { queueDocument } from '@/lib/extract';

export function scheduleProcessing(id:string){
  const task=queueDocument(id).catch(error=>{console.error('Document processing task failed',{documentId:id,code:error instanceof Error?error.name:'unknown'});});
  if(process.env.VERCEL)waitUntil(task);
  else void task;
}
