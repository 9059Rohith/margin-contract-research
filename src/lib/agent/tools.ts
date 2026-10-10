import { z } from 'zod';
import { db, repo, type Chunk } from '@/lib/db';
import type { Range } from '@/lib/quotes/matcher';

const docId=z.string().uuid().optional();
export const toolSchemas={
  search_document:z.object({query:z.string().min(1).max(200),top_k:z.number().int().min(1).max(8).default(5),doc_id:docId}),
  get_section:z.object({section_ref:z.string().min(1).max(80),doc_id:docId}),
  list_clauses:z.object({doc_id:docId}),
  get_page:z.object({page:z.number().int().min(1).max(1000),doc_id:docId}),
  read_range:z.object({start_block:z.number().int().min(0),end_block:z.number().int().min(0),doc_id:docId})
};
export type ToolName=keyof typeof toolSchemas;
export const toolDefinitions=[
  {name:'search_document',description:'Search document text for relevant clauses. Use specific legal concepts and synonyms.',parameters:{type:'object',properties:{query:{type:'string'},top_k:{type:'integer'},doc_id:{type:'string'}},required:['query']}},
  {name:'get_section',description:'Read a clause by its numbered section reference.',parameters:{type:'object',properties:{section_ref:{type:'string'},doc_id:{type:'string'}},required:['section_ref']}},
  {name:'list_clauses',description:'List clause labels and headings.',parameters:{type:'object',properties:{doc_id:{type:'string'}}}},
  {name:'get_page',description:'Read one page or DOCX synthetic section.',parameters:{type:'object',properties:{page:{type:'integer'},doc_id:{type:'string'}},required:['page']}},
  {name:'read_range',description:'Read consecutive numbered text blocks.',parameters:{type:'object',properties:{start_block:{type:'integer'},end_block:{type:'integer'},doc_id:{type:'string'}},required:['start_block','end_block']}}
] as const;

export type ToolResult={ok:true;data:string;ranges:Range[];docId:string}|{ok:false;error:{code:string;message:string;hint:string}};
const fail=(code:string,message:string,hint:string):ToolResult=>({ok:false,error:{code,message,hint}});

export function executeTool(name:string,rawArgs:string,allowedDocIds:string[]):ToolResult {
  if(!(name in toolSchemas))return fail('unknown_tool',`Unknown tool: ${name}`,'Choose one of the listed read-only tools.');
  if(rawArgs.length>3000)return fail('invalid_args','Tool arguments are too large.','Use a short query or section reference.');
  let input:unknown;
  try{input=JSON.parse(rawArgs);}catch{return fail('invalid_json','Arguments are not valid JSON.','Send a JSON object with the required fields.');}
  const schema=toolSchemas[name as ToolName];
  const parsed=schema.safeParse(input);
  if(!parsed.success)return fail('invalid_args','Tool arguments have missing or invalid fields.',parsed.error.issues.map(i=>i.path.join('.')).join(', '));
  const args=parsed.data as Record<string,unknown>;
  const id=(args.doc_id as string|undefined)??(allowedDocIds.length===1?allowedDocIds[0]:undefined);
  if(!id || !allowedDocIds.includes(id))return fail('invalid_document','Choose a document in this conversation.','Provide a valid doc_id from the selected documents.');
  if(name==='search_document') {
    const stop=new Set(['what','which','where','when','who','whom','why','how','does','this','that','there','the','and','or','for','with','from','about','into','under','agreement','document','contract','contain','contains','have','has','are','is','was','were','can','may','shall','would','could','please','tell','show','explain','its','their']);
    const words=((args.query as string).toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)??[]).filter(w=>!stop.has(w)).slice(0,8);
    if(!words.length)return fail('invalid_query','Search query has no searchable words.','Use words instead of punctuation.');
    const synonyms:Record<string,string[]>={cap:['cap','capped','limitation','limit','exceed'],termination:['termination','terminate','terminated'],payment:['payment','pay','payable'],confidentiality:['confidentiality','confidential'],notice:['notice','notify','notification'],obligations:['obligations','obligation']};
    const match=words.map(w=>{const variants=synonyms[w]??[w];return variants.length===1?`"${w}"`:`(${variants.map(v=>`"${v}"`).join(' OR ')})`;}).join(' AND ');
    const chunks=db.prepare(`SELECT c.*, bm25(chunks_fts) AS rank FROM chunks_fts JOIN chunks c ON c.id=chunks_fts.chunk_id WHERE chunks_fts MATCH ? AND chunks_fts.document_id=? ORDER BY rank LIMIT ?`).all(match,id,args.top_k) as (Chunk&{rank:number})[];
    if(!chunks.length)return {ok:true,data:'No matching passages found.',ranges:[],docId:id};
    return {ok:true,data:chunks.map(c=>`Page ${c.page_no}, range ${c.start_offset}-${c.end_offset}: ${c.text.slice(0,1400)}`).join('\n\n'),ranges:chunks.map(c=>({start:c.start_offset,end:c.end_offset})),docId:id};
  }
  if(name==='get_page') {
    const page=repo.getPages(id).find(p=>p.page_no===args.page);
    return page?{ok:true,data:`Page ${page.page_no}:\n${page.text.slice(0,18000)}`,ranges:[{start:page.start_offset,end:Math.min(page.end_offset,page.start_offset+18000)}],docId:id}:fail('not_found','Page not found.','Use a page number from the document.');
  }
  if(name==='list_clauses') {
    const outline=repo.getBlocks(id).filter(b=>b.section_label || b.kind==='heading').slice(0,300);
    return {ok:true,data:outline.map(b=>`Block ${b.order_idx} • p.${b.page_no} • ${b.text.slice(0,130)}`).join('\n')||'No numbered clauses identified.',ranges:outline.map(b=>({start:b.start_offset,end:b.end_offset})),docId:id};
  }
  if(name==='get_section') {
    const ref=(args.section_ref as string).toLowerCase().replace(/^(section|clause|article)\s+/,'');
    const blocks=repo.getBlocks(id);
    const start=blocks.findIndex(b=>b.section_label?.toLowerCase()===ref || b.text.toLowerCase().startsWith(`${ref} `));
    if(start<0)return fail('not_found',`Section ${ref} was not found.`,'Try list_clauses or search_document.');
    const selected=blocks.slice(start,Math.min(start+12,blocks.length)).filter((b,i)=>i===0 || !b.section_label).slice(0,12);
    return {ok:true,data:selected.map(b=>b.text).join('\n').slice(0,18000),ranges:selected.map(b=>({start:b.start_offset,end:b.end_offset})),docId:id};
  }
  const start=args.start_block as number,end=args.end_block as number;
  if(end<start || end-start>15)return fail('invalid_range','Read at most 16 consecutive blocks.','Choose start_block <= end_block and a span of 15 or less.');
  const selected=repo.getBlocks(id).filter(b=>b.order_idx>=start && b.order_idx<=end);
  return selected.length?{ok:true,data:selected.map(b=>`[${b.order_idx}] ${b.text}`).join('\n').slice(0,18000),ranges:selected.map(b=>({start:b.start_offset,end:b.end_offset})),docId:id}:fail('not_found','No blocks in this range.','Use list_clauses to find block numbers.');
}

export function searchFallback(query:string,docId:string):ToolResult {
  return executeTool('search_document',JSON.stringify({query,top_k:5,doc_id:docId}),[docId]);
}
