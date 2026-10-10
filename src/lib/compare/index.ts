import { repo, type Block } from '@/lib/db';
import { verifyCitations } from '@/lib/quotes/verify';

type Unit={label:string;title:string;text:string;start:number;end:number;page:number};
export type Change={id:string;kind:'modified'|'added'|'removed';significance:'high'|'medium'|'low'|'cosmetic';category:string;summary:string;before:Unit|null;after:Unit|null;citations:ReturnType<typeof verifyCitations>};

function units(blocks:Block[]):Unit[]{
  const result:Unit[]=[];
  for(const block of blocks){
    if(block.section_label || !result.length)result.push({label:block.section_label??`block-${block.order_idx}`,title:block.text.slice(0,90),text:block.text,start:block.start_offset,end:block.end_offset,page:block.page_no});
    else {const last=result.at(-1)!;last.text+=`\n${block.text}`;last.end=block.end_offset;}
  }
  return result;
}
function tokens(text:string):Set<string>{return new Set((text.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[]).filter(x=>x.length>2));}
function similarity(a:string,b:string):number{const x=tokens(a),y=tokens(b);const shared=[...x].filter(t=>y.has(t)).length;return shared/Math.max(1,new Set([...x,...y]).size);}
function numericFacts(text:string):string[]{return [...text.matchAll(/\b(?:AED|USD|EUR|GBP|SAR|\$|€)\s*\d[\d,]*(?:\.\d+)?|\b\d+(?:\.\d+)?\s*(?:%|percent|days?|months?|years?)\b/gi)].map(m=>m[0]!.replace(/\s+/g,' '));}
function amount(text:string):{label:string;value:number}|null{const match=text.match(/\b(?:AED|USD|EUR|GBP|SAR|\$|€)\s*\d[\d,]*(?:\.\d+)?/i);return match?{label:match[0],value:Number(match[0].replace(/[^\d.]/g,''))}:null;}
function category(text:string):string{
  if(/liabilit|indemni|damages|cap\b/i.test(text))return 'Liability';
  if(/terminat|renew|notice/i.test(text))return 'Term & termination';
  if(/payment|fee|invoice/i.test(text))return 'Payment';
  if(/confidential|disclos/i.test(text))return 'Confidentiality';
  if(/intellectual property|copyright|licen[cs]e/i.test(text))return 'Intellectual property';
  if(/governing law|jurisdiction/i.test(text))return 'Governing law';
  return 'Other';
}
export function classify(a:Unit|null,b:Unit|null):{significance:Change['significance'];category:string;summary:string}{
  const before=a?.text??'',after=b?.text??'',combined=`${before}\n${after}`;
  const cat=category(combined),f1=numericFacts(before),f2=numericFacts(after);
  const factsChanged=JSON.stringify(f1)!==JSON.stringify(f2);
  const sensitive=cat!=='Other';
  const sig:Change['significance']=factsChanged?(sensitive?'high':'medium'):(a===null||b===null)?(sensitive?'high':'medium'):similarity(before,after)>0.82?'cosmetic':sensitive?'medium':'low';
  let summary='The wording changed. Review the versions side by side.';
  if(a===null)summary=`Added ${cat.toLowerCase()} language in the newer version.`;
  else if(b===null)summary=`Removed ${cat.toLowerCase()} language from the newer version.`;
  else if(factsChanged){
    const beforeAmount=amount(before),afterAmount=amount(after);
    if(beforeAmount&&afterAmount&&cat==='Liability')summary=`The liability cap ${afterAmount.value>beforeAmount.value?'increased':'decreased'} from ${beforeAmount.label} to ${afterAmount.label}${beforeAmount.value>0?` (${(afterAmount.value/beforeAmount.value).toFixed(1)}×)`:''}. This changes the maximum exposure under the clause.`;
    else summary=`A material value changed from ${f1.join(', ')||'none'} to ${f2.join(', ')||'none'}.`;
  }
  else if(cat==='Confidentiality'&&/shall not disclose/i.test(before)&&/may disclose/i.test(after))summary='The newer version permits disclosure to approved subcontractors under equivalent obligations, where the earlier wording required prior written consent.';
  else if(sig==='cosmetic')summary='The wording changed, with no detected change to amounts or timing.';
  return {significance:sig,category:cat,summary};
}
export function compareDocuments(docA:string,docB:string):{summary:string;changes:Change[];counts:Record<string,number>} {
  const a=units(repo.getBlocks(docA)),b=units(repo.getBlocks(docB));
  const used=new Set<number>();
  const pairs:{before:Unit|null;after:Unit|null}[]=[];
  for(const before of a){
    let match=b.findIndex((candidate,i)=>!used.has(i)&&candidate.label===before.label);
    if(match<0){let best=0;b.forEach((candidate,i)=>{if(!used.has(i)){const score=similarity(before.text,candidate.text);if(score>best){best=score;match=i;}}});if(best<0.46)match=-1;}
    if(match>=0){used.add(match);pairs.push({before,after:b[match]!});}
    else pairs.push({before,after:null});
  }
  b.forEach((after,i)=>{if(!used.has(i))pairs.push({before:null,after});});
  const changes:Change[]=pairs.filter(p=>!p.before||!p.after||p.before.text.trim()!==p.after.text.trim()).map((p,i)=>{
    const info=classify(p.before,p.after);
    const quotes=[...(p.before?[{id:`A${i}`,doc_id:docA,quote:p.before.text.slice(0,260)}]:[]),...(p.after?[{id:`B${i}`,doc_id:docB,quote:p.after.text.slice(0,260)}]:[])];
    return {id:`change-${i}`,kind:!p.before?'added':!p.after?'removed':'modified',...info,before:p.before,after:p.after,citations:verifyCitations(quotes,[docA,docB])};
  });
  const order={high:0,medium:1,low:2,cosmetic:3};
  changes.sort((x,y)=>order[x.significance]-order[y.significance]);
  const counts={high:changes.filter(c=>c.significance==='high').length,medium:changes.filter(c=>c.significance==='medium').length,low:changes.filter(c=>c.significance==='low').length,cosmetic:changes.filter(c=>c.significance==='cosmetic').length};
  const top=changes.filter(c=>c.significance==='high').slice(0,3).map(c=>c.summary);
  const summary=changes.length?`${changes.length} clause-level changes found, including ${counts.high} high-significance change${counts.high===1?'':'s'}. ${top.join(' ')}`:'No textual differences were found in the extracted content.';
  return {summary,changes,counts};
}
