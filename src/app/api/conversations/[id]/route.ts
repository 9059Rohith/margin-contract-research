import { db,repo } from '@/lib/db';
import { AppError,errorResponse } from '@/lib/errors';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(_:Request,{params}:Context){const {id}=await params;const conversation=repo.getConversation(id);if(!conversation)return errorResponse(new AppError('not_found',404,'Conversation not found.'));return Response.json({conversation,documents:repo.getConversationDocuments(id).map(doc=>({...doc,source_path:undefined})),messages:repo.getMessages(id).map(m=>({...m,citations:JSON.parse(m.citations_json),coverage:JSON.parse(m.coverage_json)}))});}
export async function DELETE(_:Request,{params}:Context){const {id}=await params;db.prepare('DELETE FROM conversations WHERE id=?').run(id);return Response.json({ok:true});}
