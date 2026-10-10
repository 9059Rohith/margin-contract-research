import { z } from 'zod';
import { db } from '@/lib/db';
import { AppError, errorResponse } from '@/lib/errors';
import { guardMutation } from '@/lib/security/request';

export const runtime='nodejs';
const schema=z.object({messageId:z.string().uuid(),content:z.string().max(100_000)});

export async function POST(request:Request){
  try{
    guardMutation(request,'chat');
    const parsed=schema.safeParse(await request.json());
    if(!parsed.success)throw new AppError('invalid_request',400,'Invalid answer to stop.');
    const result=await db.prepare("UPDATE messages SET content=?,status='stopped' WHERE id=? AND role='assistant' AND status IN ('streaming','stopped')").run(parsed.data.content,parsed.data.messageId);
    return Response.json({stopped:result.rowsAffected===1});
  }catch(error){return errorResponse(error);}
}
