'use client';
import { ArrowUpRight,CheckCircle2,Clock3,ShieldCheck,TriangleAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Citation,Message } from '@/types/app';

type Props={message:Message;onCitation:(citation:Citation)=>void};
export function Evidence({message,onCitation}:Props){
  const verified=message.citations.filter(c=>c.result.verified);
  const rejected=message.citations.length-verified.length;
  return <div className="assistant-answer"><div className="assistant-avatar"><ShieldCheck size={17}/></div><div className="answer-main"><div className="answer-label">Margin research <span>{message.status==='stopped'?'· Stopped, partial answer':message.status==='streaming'?'· Researching…':''}</span></div><div className="answer-copy"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content.replace(/\[([A-Za-z0-9_-]+)\]/g,(match,id:string)=>verified.some(c=>c.id===id)?'':'')}</ReactMarkdown></div>
    {verified.length>0&&<div className="evidence-list"><div className="evidence-heading"><span>Supporting evidence</span><span>{verified.length} verified</span></div>{verified.map(c=><button className="evidence-card" key={c.id} onClick={()=>onCitation(c)}><div className="evidence-card-top"><span className="source-name">{c.documentName}</span><span className="verified-label"><CheckCircle2 size={13}/> Verified</span></div><blockquote>“{c.quote}”</blockquote><div className="evidence-card-bottom"><span>{c.result.verified?`${c.result.pages.map(p=>`Page ${p}`).join('–')}${c.result.occurrences.length>1?` · ${c.result.occurrences.length} occurrences`:''}`:''}</span><span>Go to passage <ArrowUpRight size={14}/></span></div></button>)}</div>}
    {rejected>0&&<div className="unverified-note"><TriangleAlert size={15}/>{rejected} unsupported quote{rejected===1?' was':'s were'} removed after verification.</div>}
    {message.coverage&&<div className="coverage-note"><Clock3 size={14}/><span>{message.coverage.mode==='agentic'?'Agentic research':'Text search'} · Read {message.coverage.coverage_pct}% of selected text{message.coverage.budget_exhausted?' · Search budget exhausted':''}</span></div>}
  </div></div>;
}
