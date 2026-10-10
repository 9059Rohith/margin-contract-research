import { z } from 'zod';
import { db,repo } from '@/lib/db';
import { compareDocuments } from '@/lib/compare';
import { AppError,errorResponse } from '@/lib/errors';
import { guardMutation } from '@/lib/security/request';
export const runtime='nodejs';
const schema=z.object({docA:z.string().uuid(),docB:z.string().uuid()});
export async function POST(request:Request){try{guardMutation(request,'compare');const parsed=schema.safeParse(await request.json());if(!parsed.success||parsed.data.docA===parsed.data.docB)throw new AppError('invalid_request',400,'Choose two different documents.');const {docA,docB}=parsed.data;const [a,b]=await Promise.all([repo.getDocument(docA),repo.getDocument(docB)]);if(a?.status!=='ready'||b?.status!=='ready')throw new AppError('not_ready',409,'Both documents must be ready.');const cached=await db.prepare('SELECT result_json FROM comparisons WHERE doc_a_id=? AND doc_b_id=? ORDER BY created_at DESC LIMIT 1').get(docA,docB) as {result_json:string}|undefined;if(cached){const value=JSON.parse(cached.result_json) as {version?:number};if(value.version===2)return Response.json(value);}const result={version:2,...await compareDocuments(docA,docB)};await db.batch([{sql:'DELETE FROM comparisons WHERE doc_a_id=? AND doc_b_id=?',args:[docA,docB]},{sql:'INSERT INTO comparisons(id,doc_a_id,doc_b_id,result_json,created_at) VALUES(?,?,?,?,?)',args:[crypto.randomUUID(),docA,docB,JSON.stringify(result),new Date().toISOString()]}]);return Response.json(result);}catch(error){return errorResponse(error);}}
