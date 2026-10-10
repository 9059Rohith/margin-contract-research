import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const base=process.env.SMOKE_BASE_URL||'http://localhost:3000';
async function api(route,options={}){const res=await fetch(base+route,options);const body=await res.json();if(!res.ok)throw new Error(`${route}: ${res.status} ${JSON.stringify(body)}`);return body;}
async function upload(filename,type){const buffer=await fs.readFile(path.resolve(filename));const form=new FormData();form.append('file',new Blob([buffer],{type}),path.basename(filename));const response=await fetch(base+'/api/documents',{method:'POST',body:form});return {status:response.status,...await response.json()};}
async function waitReady(id){for(let i=0;i<Number(process.env.SMOKE_WAIT_SECONDS||300);i++){const {document}=await api(`/api/documents/${id}`);if(document.status==='ready')return document;if(document.status==='failed')throw new Error(`Processing failed: ${document.failure_message}`);await new Promise(resolve=>setTimeout(resolve,1000));}throw new Error(`Timed out waiting for ${id}`);}
assert.equal((await api('/api/health')).ok,true);
const bad=await upload('tests/fixtures/not-a-contract.txt','text/plain');assert.equal(bad.status,415);assert.equal(bad.error.code,'unsupported_type');
const first=await upload('tests/fixtures/msa-v1.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document');
const second=await upload('tests/fixtures/msa-v2.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document');
const a=await waitReady(first.document.id),b=await waitReady(second.document.id);
assert.ok(a.char_count>100);assert.ok(b.char_count>100);
const page=await api(`/api/documents/${a.id}/text?page=1`);assert.ok(page.blocks.length>0);
const compare=await api('/api/compare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({docA:a.id,docB:b.id})});
assert.ok(compare.changes.some(c=>c.significance==='high'&&c.summary.includes('1,000,000')),'cap increase was not ranked high');
const {conversation}=await api('/api/conversations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({docIds:[a.id]})});
const response=await fetch(base+'/api/chat/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversationId:conversation.id,question:'What is the liability cap?'})});
assert.equal(response.status,200);
const stream=await response.text();assert.match(stream,/"type":"meta"/);assert.match(stream,/"type":"done"/);
const history=await api(`/api/conversations/${conversation.id}`);assert.equal(history.messages.length,2);assert.ok(history.messages[1].content.length>0);
assert.equal(history.messages[1].citations[0]?.result.verified,true,'chat did not retain a verified quote');
if(history.messages[1].coverage.mode==='retrieval')assert.match(history.messages[1].content,/potentially relevant passage/);
const {conversation:multiConversation}=await api('/api/conversations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({docIds:[a.id,b.id]})});
const multiResponse=await fetch(base+'/api/chat/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversationId:multiConversation.id,question:'Compare the liability caps in these two versions. State the amount in each and quote the relevant clause from each document.'})});
assert.equal(multiResponse.status,200);
assert.match(await multiResponse.text(),/"type":"done"/);
const multiHistory=await api(`/api/conversations/${multiConversation.id}`);
const multiAnswer=multiHistory.messages[1];
assert.ok(multiAnswer.content.includes('100,000')&&multiAnswer.content.includes('1,000,000'),'multi-document answer omitted a liability amount');
assert.ok([a.id,b.id].every(id=>multiAnswer.citations.some(c=>c.docId===id&&c.result.verified)),'multi-document answer did not verify a quote for each document');
const assignmentPdf='hiring assignment.pdf';
let parsedPdf=null;
if(await fs.access(path.resolve(assignmentPdf)).then(()=>true,()=>false)){
  const pdf=await upload(assignmentPdf,'application/pdf');
  parsedPdf=await waitReady(pdf.document.id);
  assert.ok(parsedPdf.page_count>=6);
}
const scan=await upload('tests/fixtures/scanned-no-text.pdf','application/pdf');
let failedScan=false;
for(let i=0;i<120;i++){const {document}=await api(`/api/documents/${scan.document.id}`);if(document.status==='failed'){assert.equal(document.failure_code,'no_text');failedScan=true;break;}await new Promise(resolve=>setTimeout(resolve,1000));}
assert.equal(failedScan,true,'scanned PDF did not fail clearly');
const large=await upload('tests/fixtures/contract-150-pages.pdf','application/pdf');
const largeDoc=await waitReady(large.document.id);assert.equal(largeDoc.page_count,150);
const page120=await api(`/api/documents/${largeDoc.id}/text?page=120`);assert.match(page120.page.text,/AED 250,000/);
const offsetPage=await api(`/api/documents/${largeDoc.id}/text?offset=${page120.page.start_offset}`);assert.equal(offsetPage.page.page_no,120);
const {conversation:largeConversation}=await api('/api/conversations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({docIds:[largeDoc.id]})});
const negative=await fetch(base+'/api/chat/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversationId:largeConversation.id,question:'Does this agreement contain a unicorn clause?'})});
const negativeStream=await negative.text();assert.match(negativeStream,/cannot confirm/i);
console.log(JSON.stringify({ok:true,docx:[a.page_count,b.page_count],assignmentPdfPages:parsedPdf?.page_count??'not present',largePages:largeDoc.page_count,scannedRejected:failedScan,changes:compare.changes.length,high:compare.counts.high,events:stream.split('data: ').length-1},null,2));
