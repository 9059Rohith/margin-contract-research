import { repo } from '@/lib/db';
import { verifyQuote, type DocIndex, type VerificationResult } from './matcher';

export type Citation = { id: string; docId: string; documentName: string; quote: string; result: VerificationResult };
export async function buildIndex(docId:string):Promise<DocIndex|null> {
  const [text,pages,blocks]=await Promise.all([repo.getFullText(docId),repo.getPages(docId),repo.getBlocks(docId)]);
  if(!text)return null;
  return {text,pages:pages.map(p=>({start:p.start_offset,end:p.end_offset,page:p.page_no,id:p.id})),blocks:blocks.map(b=>({start:b.start_offset,end:b.end_offset,page:b.page_no,id:b.id}))};
}
export async function verifyCitations(quotes:{id:string;doc_id:string;quote:string}[],allowedDocs:string[]):Promise<Citation[]> {
  const filtered=quotes.filter(q=>allowedDocs.includes(q.doc_id));
  const indexes=new Map<string,{index:DocIndex|null;name:string}>();
  await Promise.all([...new Set(filtered.map(q=>q.doc_id))].map(async id=>{
    const [index,doc]=await Promise.all([buildIndex(id),repo.getDocument(id)]);
    indexes.set(id,{index,name:doc?.name??'Document'});
  }));
  return filtered.map(q=>{
    const entry=indexes.get(q.doc_id);
    return {id:q.id,docId:q.doc_id,documentName:entry?.name??'Document',quote:q.quote,result:entry?.index?verifyQuote(entry.index,q.quote):{verified:false,reason:'not_found' as const}};
  });
}
