import { deleteDocument, repo } from '@/lib/db';
import { AppError, errorResponse } from '@/lib/errors';
import { guardMutation } from '@/lib/security/request';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(_:Request,{params}:Context){const {id}=await params;const doc=await repo.getDocument(id);if(!doc)return errorResponse(new AppError('not_found',404,'Document not found.'));return Response.json({document:{...doc,source_path:undefined,lease_until:undefined}});}
export async function DELETE(request:Request,{params}:Context){try{guardMutation(request,'delete');const {id}=await params;return await deleteDocument(id)?Response.json({ok:true}):errorResponse(new AppError('not_found',404,'Document not found.'));}catch(error){return errorResponse(error);}}
