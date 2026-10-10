import crypto from 'node:crypto';
import { z } from 'zod';
import { db, repo } from '@/lib/db';
import { AppError,errorResponse } from '@/lib/errors';
import { guardMutation } from '@/lib/security/request';
const schema=z.object({docIds:z.array(z.string().uuid()).min(1).max(6),title:z.string().max(160).optional()});
export const runtime='nodejs';
export async function GET(request:Request){const docId=new URL(request.url).searchParams.get('docId');return Response.json({conversations:docId?await repo.getConversations(docId):[]});}
export async function POST(request:Request){try{guardMutation(request,'conversation');const parsed=schema.safeParse(await request.json());if(!parsed.success)throw new AppError('invalid_request',400,'Select one to six documents.');const {docIds,title}=parsed.data;const docs=await Promise.all(docIds.map(id=>repo.getDocument(id)));if(docs.some(doc=>doc?.status!=='ready'))throw new AppError('not_ready',409,'Wait until all selected documents are ready.');const id=crypto.randomUUID();await db.batch([{sql:'INSERT INTO conversations(id,title,scope,created_at) VALUES(?,?,?,?)',args:[id,title||'New research',docIds.length>1?'multi':'single',new Date().toISOString()]},...docIds.map(docId=>({sql:'INSERT INTO conversation_documents(conversation_id,document_id) VALUES(?,?)',args:[id,docId]}))]);return Response.json({conversation:await repo.getConversation(id)});}catch(error){return errorResponse(error);}}
