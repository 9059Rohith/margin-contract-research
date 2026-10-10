import { deleteDocument, repo } from '@/lib/db';
import { AppError, errorResponse } from '@/lib/errors';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(_:Request,{params}:Context){const {id}=await params;const doc=await repo.getDocument(id);if(!doc)return errorResponse(new AppError('not_found',404,'Document not found.'));return Response.json({document:{...doc,source_path:undefined,lease_until:undefined}});}
export async function DELETE(_:Request,{params}:Context){const {id}=await params;return await deleteDocument(id)?Response.json({ok:true}):errorResponse(new AppError('not_found',404,'Document not found.'));}
