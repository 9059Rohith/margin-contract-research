export type Range = { start: number; end: number };
export type Segment = Range & { page: number; blockId?: string };
export type Boundary = Range & { page: number; id?: string };
export type DocIndex = { text: string; pages: Boundary[]; blocks?: Boundary[] };
export type VerificationResult =
  | { verified: true; matchType: 'exact'|'normalised'; occurrences: Range[]; primary: Range; ranges: Segment[]; pages: number[] }
  | { verified: false; reason: 'not_found'|'too_short'|'ambiguous_fragment' };

type Unit = { char: string; offset: number };
const quoteMap: Record<string,string> = { '“':'"','”':'"','„':'"','«':'"','»':'"','‘':"'",'’':"'",'‛':"'",'–':'-','—':'-','−':'-','‑':'-' };

/** Build a comparison string and a character-level map back to canonical source offsets. */
export function normalizeWithMap(source: string): { text: string; offsets: number[] } {
  const units: Unit[]=[];
  for(let i=0;i<source.length;) {
    const code=source.codePointAt(i)!;
    const original=String.fromCodePoint(code);
    const next=i+original.length;
    if ((original==='-' || original==='‐') && /^\r?\n\p{L}/u.test(source.slice(next))) {
      i=next+(source[next]==='\r'?2:1); continue;
    }
    if (original==='\u00ad' || original==='\u200b' || original==='\u200c' || original==='\u200d') {i=next;continue;}
    const converted=(quoteMap[original] ?? original.normalize('NFKC')).toLowerCase();
    for(const char of converted) units.push({char:/\s/u.test(char)?' ':char,offset:i});
    i=next;
  }
  const out: Unit[]=[];
  for(const unit of units) {
    if(unit.char===' ') {
      if(!out.length || out.at(-1)?.char===' ') continue;
      out.push(unit);
    } else if (/[,.;:!?)]/.test(unit.char) && out.at(-1)?.char===' ') {
      out.pop(); out.push(unit);
    } else out.push(unit);
  }
  if(out.at(-1)?.char===' ')out.pop();
  return {text:out.map(x=>x.char).join(''),offsets:out.map(x=>x.offset)};
}

function splitSegments(range:Range, index:DocIndex):Segment[] {
  const boundaries=index.blocks?.length?index.blocks:index.pages;
  const segments:Segment[]=[];
  for(const boundary of boundaries) {
    const start=Math.max(range.start,boundary.start),end=Math.min(range.end,boundary.end);
    if(start<end)segments.push({start,end,page:boundary.page,blockId:boundary.id});
  }
  return segments;
}

export function verifyQuote(index:DocIndex, quote:string, preferredRange?:Range):VerificationResult {
  const clean=quote.trim().replace(/^(?:\[?…\]?|\.{3})\s*/u,'').replace(/\s*(?:\[?…\]?|\.{3})$/u,'').replace(/^[\s"'“”]+|[\s"'“”]+$/g,'');
  const q=normalizeWithMap(clean).text;
  if(q.length<8 || q.split(/\s+/).filter(Boolean).length<2)return {verified:false,reason:'too_short'};
  const doc=normalizeWithMap(index.text);
  const positions:number[]=[];
  let at=0;
  while((at=doc.text.indexOf(q,at))!==-1){positions.push(at);at+=Math.max(q.length,1);}
  if(!positions.length)return {verified:false,reason:'not_found'};
  const occurrences=positions.map(start=>({start:doc.offsets[start]!,end:doc.offsets[start+q.length-1]!+1}));
  const primary=occurrences.find(r=>preferredRange && r.start>=preferredRange.start && r.end<=preferredRange.end) ?? occurrences[0]!;
  const ranges=splitSegments(primary,index);
  const pages=[...new Set(ranges.map(r=>r.page))];
  return {verified:true,matchType:index.text.includes(clean)?'exact':'normalised',occurrences,primary,ranges,pages};
}
