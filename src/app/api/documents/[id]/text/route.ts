import { repo } from '@/lib/db';
import { AppError, errorResponse } from '@/lib/errors';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){
  try{const {id}=await params;const doc=await repo.getDocument(id);if(!doc)throw new AppError('not_found',404,'Document not found.');
    const query=new URL(request.url).searchParams;
    const offsetParam=query.get('offset');
    const page=Number(query.get('page')||'1');
    const offset=offsetParam===null?null:Number(offsetParam);
    if(!Number.isInteger(page)||page<1||offset!==null&&(!Number.isInteger(offset)||offset<0))throw new AppError('invalid_page',400,'Invalid page or text offset.');
    const [pages,blocks]=await Promise.all([repo.getPages(id),repo.getBlocks(id)]);
    const selected=offset===null?pages.find(p=>p.page_no===page):pages.find(p=>p.start_offset<=offset&&offset<p.end_offset);
    return Response.json({page:selected??null,blocks:blocks.filter(b=>b.page_no===selected?.page_no),totalPages:pages.length,synthetic:doc.mime!=='application/pdf'});
  }catch(error){return errorResponse(error);}
}
