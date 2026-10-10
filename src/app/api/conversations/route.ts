import crypto from 'node:crypto';
import { z } from 'zod';
import { db, repo } from '@/lib/db';
import { AppError,errorResponse } from '@/lib/errors';
import { guardMutation } from '@/lib/security/request';
const schema=z.object({docIds:z.array(z.string().uuid()).min(1).max(6),title:z.string().max(160).optional()});
export const runtime='nodejs';
export async function GET(request:Request){const docId=new URL(request.url).searchParams.get('docId');return Response.json({conversations:docId?repo.getConversations(docId):[]});}
export async function POST(request:Request){try{guardMutation(request,'conversation');const parsed=schema.safeParse(await request.json());if(!parsed.success)throw new AppError('invalid_request',400,'Select one to six documents.');const {docIds,title}=parsed.data;if(docIds.some(id=>repo.getDocument(id)?.status!=='ready'))throw new AppError('not_ready',409,'Wait until all selected documents are ready.');const id=crypto.randomUUID();db.transaction(()=>{db.prepare('INSERT INTO conversations(id,title,scope,created_at) VALUES(?,?,?,?)').run(id,title||'New research',docIds.length>1?'multi':'single',new Date().toISOString());const add=db.prepare('INSERT INTO conversation_documents(conversation_id,document_id) VALUES(?,?)');for(const docId of docIds)add.run(id,docId);})();return Response.json({conversation:repo.getConversation(id)});}catch(error){return errorResponse(error);}}
