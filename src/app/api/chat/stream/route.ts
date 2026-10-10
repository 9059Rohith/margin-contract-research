import crypto from 'node:crypto';
import { z } from 'zod';
import { db,repo } from '@/lib/db';
import { research } from '@/lib/agent/loop';
import { AppError,errorResponse } from '@/lib/errors';
import { guardMutation } from '@/lib/security/request';
export const runtime='nodejs';
export const maxDuration=120;
const schema=z.object({conversationId:z.string().uuid(),question:z.string().trim().min(2).max(2000)});
export async function POST(request:Request){
  let payload:z.infer<typeof schema>;
  try{guardMutation(request,'chat');const parsed=schema.safeParse(await request.json());if(!parsed.success)throw new AppError('invalid_request',400,'Enter a question up to 2,000 characters.');payload=parsed.data;if(!await repo.getConversation(payload.conversationId))throw new AppError('not_found',404,'Conversation not found.');}catch(error){return errorResponse(error);}
  const {conversationId,question}=payload;
  const docs=await repo.getConversationDocuments(conversationId);
  const userId=crypto.randomUUID(),assistantId=crypto.randomUUID(),now=new Date().toISOString();
  await db.batch([
    {sql:"INSERT INTO messages(id,conversation_id,role,content,status,citations_json,coverage_json,created_at) VALUES(?,?,? ,?,'complete','[]','{}',?)",args:[userId,conversationId,'user',question,now]},
    {sql:"INSERT INTO messages(id,conversation_id,role,content,status,citations_json,coverage_json,created_at) VALUES(?,?,? ,?,'streaming','[]','{}',?)",args:[assistantId,conversationId,'assistant','',now]},
    {sql:"UPDATE conversations SET title=? WHERE id=? AND title='New research'",args:[question.slice(0,80),conversationId]},
  ]);
  const encoder=new TextEncoder();
  const stream=new ReadableStream<Uint8Array>({
    async start(controller){
      let partial='';
      const send=(event:{type:string;[key:string]:unknown})=>{
        if(event.type==='delta'&&typeof event.text==='string')partial+=event.text;
        if(event.type==='replace'&&typeof event.text==='string')partial=event.text;
        try{controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));}catch{/* browser disconnected */}
      };
      send({type:'meta',conversationId,messageId:assistantId});
      try{
        const answer=await research(question,docs.map(d=>d.id),send,request.signal);
        const saved=await db.prepare("UPDATE messages SET content=?,status=?,citations_json=?,coverage_json=? WHERE id=? AND status='streaming'").run(answer.content,answer.status,JSON.stringify(answer.citations),JSON.stringify(answer.coverage),assistantId);
        if(saved.rowsAffected===0){send({type:'done',status:'stopped'});return;}
        send({type:'citations',citations:answer.citations});send({type:'coverage',coverage:answer.coverage});send({type:'done',status:answer.status});
      }catch(error){
        const stopped=request.signal.aborted || (error instanceof Error&&error.name==='AbortError');
        await db.prepare("UPDATE messages SET content=?,status=? WHERE id=? AND status='streaming'").run(partial,stopped?'stopped':'error',assistantId);
        send({type:'error',code:stopped?'stopped':'research_failed',message:stopped?'Stopped — partial answer kept.':'Research failed. Please try again.'});
      }finally{try{controller.close();}catch{/* closed */}}
    }
  });
  return new Response(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive'}});
}
