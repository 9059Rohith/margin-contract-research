import { deleteDocument, repo } from '@/lib/db';
import { AppError, errorResponse } from '@/lib/errors';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(_:Request,{params}:Context){const {id}=await params;const doc=repo.getDocument(id);if(!doc)return errorResponse(new AppError('not_found',404,'Document not found.'));return Response.json({document:{...doc,source_path:undefined}});}
export async function DELETE(_:Request,{params}:Context){const {id}=await params;return deleteDocument(id)?Response.json({ok:true}):errorResponse(new AppError('not_found',404,'Document not found.'));}
