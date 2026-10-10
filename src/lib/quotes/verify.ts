import { repo } from '@/lib/db';
import { verifyQuote, type DocIndex, type VerificationResult } from './matcher';

export type Citation = { id: string; docId: string; documentName: string; quote: string; result: VerificationResult };
export function buildIndex(docId:string):DocIndex|null {
  const text=repo.getFullText(docId);
  if(!text)return null;
  return {text,pages:repo.getPages(docId).map(p=>({start:p.start_offset,end:p.end_offset,page:p.page_no,id:p.id})),blocks:repo.getBlocks(docId).map(b=>({start:b.start_offset,end:b.end_offset,page:b.page_no,id:b.id}))};
}
export function verifyCitations(quotes:{id:string;doc_id:string;quote:string}[],allowedDocs:string[]):Citation[] {
  return quotes.filter(q=>allowedDocs.includes(q.doc_id)).map(q=>{
    const index=buildIndex(q.doc_id);
    const doc=repo.getDocument(q.doc_id);
    return {id:q.id,docId:q.doc_id,documentName:doc?.name??'Document',quote:q.quote,result:index?verifyQuote(index,q.quote):{verified:false,reason:'not_found' as const}};
  });
}
