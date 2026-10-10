import { repo } from '@/lib/db';
import { AppError, errorResponse } from '@/lib/errors';
import { readStoredFileRange } from '@/lib/storage';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const doc = await repo.getDocument(id);
    if (!doc) throw new AppError('not_found', 404, 'Document not found.');
    if (doc.mime !== 'application/pdf' || doc.status !== 'ready') {
      throw new AppError('not_ready', 409, 'The original PDF is not available yet.');
    }
    const query=new URL(request.url).searchParams;
    const start=Number(query.get('start'));
    const end=Number(query.get('end'));
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>=doc.size_bytes||end-start>=1024*1024){
      throw new AppError('invalid_range',400,'Request a PDF chunk of up to 1 MB.');
    }
    const bytes = await readStoredFileRange(doc.source_path,start,end);
    if(bytes.length!==end-start+1)throw new Error('The stored PDF returned an incomplete chunk.');
    return new Response(new Uint8Array(bytes), {
      status:206,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(bytes.length),
        'Content-Range': `bytes ${start}-${end}/${doc.size_bytes}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
