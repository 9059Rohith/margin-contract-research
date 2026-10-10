'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { ArrowLeft,ArrowRight,BookOpen,Check,ChevronLeft,ChevronRight,FileText,X } from 'lucide-react';
import type { Block,Citation,DocumentRecord,Page } from '@/types/app';
import { PdfViewer } from './PdfViewer';

type Props={doc:DocumentRecord|null;citation:Citation|null;onClearCitation:()=>void};
type PageData={page:Page|null;blocks:Block[];totalPages:number;synthetic:boolean};
export function Reader({doc,citation,onClearCitation}:Props){
  const [pageNo,setPageNo]=useState(1),[pages,setPages]=useState<PageData[]>([]),[occurrence,setOccurrence]=useState(0);
  const [view,setView]=useState<'pdf'|'text'>('pdf');
  const [viewerMessage,setViewerMessage]=useState('');
  const scroller=useRef<HTMLDivElement>(null);
  const docId=doc?.id,docStatus=doc?.status;
  useEffect(()=>{setPageNo(1);setPages([]);setOccurrence(0);setView('pdf');setViewerMessage('');},[doc?.id]);
  useEffect(()=>{const result=citation?.result;if(result?.verified){setOccurrence(Math.max(0,result.occurrences.findIndex(r=>r.start===result.primary.start)));setPageNo(result.pages[0]??1);}},[citation]);
  useEffect(()=>{
    if(!docId||docStatus!=='ready')return;
    let cancelled=false;
    const selected=citation&&citation.docId===docId&&citation.result.verified?citation.result.occurrences[occurrence]:null;
    const queries=selected?[`offset=${selected.start}`,`offset=${Math.max(selected.start,selected.end-1)}`]:[`page=${pageNo}`];
    Promise.all(queries.map(async query=>{const r=await fetch(`/api/documents/${docId}/text?${query}`);return await r.json() as PageData;})).then(data=>{
      if(cancelled)return;
      const unique=new Map<number,PageData>();
      for(const item of data)if(item.page)unique.set(item.page.page_no,item);
      setPages([...unique.values()].sort((a,b)=>(a.page?.page_no??0)-(b.page?.page_no??0)));
      if(selected&&data[0]?.page?.page_no&&data[0].page.page_no!==pageNo)setPageNo(data[0].page.page_no);
    });
    return()=>{cancelled=true;};
  },[docId,docStatus,pageNo,citation,occurrence]);
  useEffect(()=>{if(view==='text'&&citation&&pages.length){const timer=setTimeout(()=>scroller.current?.querySelector('[data-citation-target="true"]')?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}),80);return()=>clearTimeout(timer);}},[citation,pages,occurrence,view]);
  const onPdfUnavailable=useCallback((message:string)=>{setViewerMessage(message);setView('text');},[]);
  const verifiedResult=citation?.result.verified?citation.result:null;
  const highlight=citation&&citation.docId===doc?.id&&verifiedResult?verifiedResult.occurrences[occurrence]:null;
  function renderBlock(block:Block){
    if(!highlight||highlight.end<=block.start_offset||highlight.start>=block.end_offset)return block.text;
    const start=Math.max(0,highlight.start-block.start_offset),end=Math.min(block.text.length,highlight.end-block.start_offset);
    return <>{block.text.slice(0,start)}<mark data-citation-target="true" tabIndex={-1} aria-label={`Cited passage, page ${block.page_no}`}>{block.text.slice(start,end)}</mark>{block.text.slice(end)}</>;
  }
  if(!doc)return <section className="reader empty-reader"><div className="reader-empty"><div className="empty-icon"><BookOpen size={29}/></div><h2>A clearer view of every clause.</h2><p>Upload a contract to read, research, and trace every answer back to its source.</p><label className="primary-button" htmlFor="upload-input">Upload a contract <ArrowRight size={16}/></label></div></section>;
  return <section className="reader" aria-label="Document reader">
    <header className="reader-header"><div className="reader-title"><FileText size={22}/><div><h2 title={doc.name}>{doc.name}</h2><span>{doc.mime==='application/pdf'?'PDF document':'DOCX document'} · {doc.page_count||'—'} {doc.page_count===1?doc.mime==='application/pdf'?'page':'section':doc.mime==='application/pdf'?'pages':'sections'}</span></div></div><span className={`status-badge ${doc.status}`}>{doc.status==='ready'?<><Check size={13}/> Ready</>:doc.status}</span></header>
    {doc.status==='ready'?<><div className="reader-toolbar"><div className="page-controls"><button aria-label="Previous page" disabled={pageNo<=1} onClick={()=>setPageNo(p=>p-1)}><ChevronLeft size={17}/></button><span>{pageNo} <em>/</em> {doc.page_count}</span><button aria-label="Next page" disabled={pageNo>=doc.page_count} onClick={()=>setPageNo(p=>p+1)}><ChevronRight size={17}/></button></div>{doc.mime==='application/pdf'?<div className="reader-view-switch" aria-label="PDF view"><button className={view==='pdf'?'selected':''} aria-pressed={view==='pdf'} onClick={()=>{setViewerMessage('');setView('pdf');}}>Original PDF</button><button className={view==='text'?'selected':''} aria-pressed={view==='text'} onClick={()=>setView('text')}>Extracted text</button></div>:<span className="reader-toolbar-note">DOCX sections are approximate</span>}{highlight&&<button className="clear-highlight" onClick={onClearCitation}>Clear highlight <X size={14}/></button>}</div>
      {highlight&&verifiedResult&&verifiedResult.occurrences.length>1&&<div className="occurrence-bar">This quote appears {verifiedResult.occurrences.length} times <button onClick={()=>setOccurrence(i=>(i-1+verifiedResult.occurrences.length)%verifiedResult.occurrences.length)} aria-label="Previous occurrence"><ArrowLeft size={14}/></button> {occurrence+1} of {verifiedResult.occurrences.length} <button onClick={()=>setOccurrence(i=>(i+1)%verifiedResult.occurrences.length)} aria-label="Next occurrence"><ArrowRight size={14}/></button></div>}
      {viewerMessage&&<div className="reader-view-message" role="status">{viewerMessage}</div>}
      <div className="reader-scroll" ref={scroller}>{pages.length?(doc.mime==='application/pdf'&&view==='pdf'?<PdfViewer docId={doc.id} size={doc.size_bytes} pages={pages.flatMap(item=>item.page?[item.page]:[])} highlight={highlight??null} onUnavailable={onPdfUnavailable}/>:pages.map(({page,blocks,synthetic})=>page&&<article className="paper-page" key={page.id}><div className="paper-topline"><span>{synthetic?'SECTION':'PAGE'} {page.page_no}</span><span>MARGIN / DOCUMENT READER</span></div><div className="paper-content">{blocks.map(block=><p className={block.kind==='heading'?'document-heading':block.kind==='table_cell'?'document-cell':''} key={block.id}>{renderBlock(block)}</p>)}</div><div className="paper-footer">{doc.name} <span>{page.page_no}</span></div></article>)):<div className="loading-reader">Opening document…</div>}</div>
    </>:<div className="processing-state"><div className="spinner"/><h3>{doc.status==='failed'?'This file could not be processed':doc.status==='indexing'?'Building search index…':doc.status==='extracting'&&doc.progress_total?`Reading page ${doc.progress_done} of ${doc.progress_total}…`:'Reading your document…'}</h3><p>{doc.failure_message||'Your document will open here when it is ready.'}</p>{doc.status==='extracting'&&doc.progress_total>0&&<div className="processing-progress" role="progressbar" aria-valuenow={doc.progress_done} aria-valuemin={0} aria-valuemax={doc.progress_total}><span style={{width:`${Math.round(doc.progress_done/doc.progress_total*100)}%`}}/></div>}</div>}
  </section>;
}
