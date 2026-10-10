import { afterAll,beforeAll,describe,it,expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

const docId='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const quote='The Supplier total liability shall not exceed AED 100,000 in aggregate.';
let server:http.Server;
let port:number;
let calls=0;

beforeAll(async()=>{
  process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'margin-agent-'));
  process.env.LLM_API_KEY='test-key';
  server=http.createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    const parsed=JSON.parse(body) as {stream?:boolean;messages:{role:string}[]};
    calls++;
    res.setHeader('Content-Type',parsed.stream?'text/event-stream':'application/json');
    if(parsed.stream){
      const answer=JSON.stringify({answer_markdown:'The liability cap is AED 100,000. [Q1]',answer_status:'answered',quotes:[{id:'Q1',doc_id:docId,quote}]});
      for(let i=0;i<answer.length;i+=25)res.write(`data: ${JSON.stringify({id:'chatcmpl-test',object:'chat.completion.chunk',choices:[{index:0,delta:{content:answer.slice(i,i+25)},finish_reason:null}]})}\n\n`);
      res.end('data: [DONE]\n\n');return;
    }
    const toolCount=parsed.messages.filter(m=>m.role==='tool').length;
    const tool=toolCount===0?{name:'search_document',arguments:JSON.stringify({query:'liability cap',top_k:2,doc_id:docId})}:toolCount===1?{name:'get_page',arguments:JSON.stringify({page:1,doc_id:docId})}:null;
    const message=tool?{role:'assistant',content:null,tool_calls:[{id:`call_${toolCount}`,type:'function',function:tool}]}:{role:'assistant',content:'Evidence gathered.'};
    res.end(JSON.stringify({id:'chatcmpl-test',object:'chat.completion',created:1,model:'mock',choices:[{index:0,message,finish_reason:tool?'tool_calls':'stop'}]}));
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  port=(server.address() as {port:number}).port;
  process.env.LLM_BASE_URL=`http://127.0.0.1:${port}`;
  process.env.LLM_MODEL='mock';
  const {db}=await import('../src/lib/db');
  const now=new Date().toISOString();
  db.prepare('INSERT INTO documents(id,name,mime,size_bytes,sha256,status,page_count,char_count,source_path,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(docId,'Mock MSA','application/pdf',100,'hash','ready',1,quote.length,'unused',now,now);
  db.prepare('INSERT INTO document_text(document_id,full_text,version) VALUES(?,?,1)').run(docId,quote);
  db.prepare('INSERT INTO doc_pages(id,document_id,page_no,start_offset,end_offset,text) VALUES(?,?,?,?,?,?)').run('page1',docId,1,0,quote.length,quote);
  db.prepare('INSERT INTO doc_blocks(id,document_id,page_no,order_idx,kind,section_label,start_offset,end_offset,text) VALUES(?,?,?,?,?,?,?,?,?)').run('block1',docId,1,0,'paragraph','5',0,quote.length,quote);
  db.prepare('INSERT INTO chunks(id,document_id,page_no,start_offset,end_offset,text) VALUES(?,?,?,?,?,?)').run('chunk1',docId,1,0,quote.length,quote);
  db.prepare('INSERT INTO chunks_fts(chunk_id,document_id,text) VALUES(?,?,?)').run('chunk1',docId,quote);
});
afterAll(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));});
describe('agent loop with scripted provider',()=>{
  it('uses tools over multiple rounds and verifies the streamed final quote',async()=>{
    const {research}=await import('../src/lib/agent/loop');
    const events:{type:string}[]=[];
    const result=await research('What is the liability cap?',[docId],event=>events.push(event),new AbortController().signal);
    expect(calls).toBeGreaterThanOrEqual(4);
    expect(events.filter(e=>e.type==='tool_call')).toHaveLength(2);
    expect(events.some(e=>e.type==='delta')).toBe(true);
    expect(result.citations[0]?.result.verified).toBe(true);
    expect(result.content).toContain('AED 100,000');
    expect(result.coverage.coverage_pct).toBe(100);
  });
});
