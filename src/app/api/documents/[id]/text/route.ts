import { repo } from '@/lib/db';
import { AppError, errorResponse } from '@/lib/errors';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){
  try{const {id}=await params;const doc=await repo.getDocument(id);if(!doc)throw new AppError('not_found',404,'Document not found.');
    const page=Number(new URL(request.url).searchParams.get('page')||'1');
    if(!Number.isInteger(page)||page<1)throw new AppError('invalid_page',400,'Invalid page number.');
    const [pages,blocks]=await Promise.all([repo.getPages(id),repo.getBlocks(id)]),selected=pages.find(p=>p.page_no===page);
    return Response.json({page:selected??null,blocks:blocks.filter(b=>b.page_no===page),totalPages:pages.length,synthetic:doc.mime!=='application/pdf'});
  }catch(error){return errorResponse(error);}
}
