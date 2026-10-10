import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { AppError } from '@/lib/errors';
import { db, repo } from '@/lib/db';
import { env } from '@/lib/env';

export type ExtractPage = { text: string; blocks: { text: string; kind: string; sectionLabel: string | null }[] };

export async function sniffFile(buffer: Buffer, filename: string): Promise<'pdf'|'docx'> {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'pdf' && buffer.subarray(0, 5).toString() === '%PDF-') return 'pdf';
  if (ext === 'docx' && buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    const zip = await JSZip.loadAsync(buffer, { checkCRC32: false });
    const files = Object.values(zip.files);
    if (files.length > 2000 || !zip.file('word/document.xml')) throw new AppError('unsupported_type', 415, 'This is not a valid DOCX file.');
    let total = 0;
    for (const entry of files) {
      const size = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
      total += size;
      if (size > 50_000_000 || total > 100_000_000) throw new AppError('too_large', 413, 'The DOCX expands beyond the safe processing limit.');
    }
    return 'docx';
  }
  throw new AppError('unsupported_type', 415, `Only PDF and DOCX files are supported. You uploaded a .${ext || 'unknown'} file.`);
}

async function extractPdf(buffer: Buffer, progress:(done:number,total:number)=>void): Promise<ExtractPage[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  let pdf: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>;
  try {
    pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, disableFontFace: true }).promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/password|encrypted/i.test(message)) throw new AppError('encrypted', 422, 'This PDF is password-protected.');
    throw new AppError('corrupt', 422, 'This PDF could not be read.');
  }
  if (pdf.numPages > env.MAX_PAGES) throw new AppError('too_many_pages', 413, `This PDF has ${pdf.numPages} pages. The limit is ${env.MAX_PAGES}.`);
  const pages: ExtractPage[] = [];
  progress(0,pdf.numPages);
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.filter((item): item is typeof item & { str: string; transform: number[] } => 'str' in item && 'transform' in item)
      .map(item => ({ str: item.str, x: item.transform[4] ?? 0, y: item.transform[5] ?? 0 }));
    items.sort((a,b) => Math.abs(a.y-b.y) > 3 ? b.y-a.y : a.x-b.x);
    const lines: { y: number; text: string }[] = [];
    for (const item of items) {
      const last = lines.at(-1);
      if (last && Math.abs(last.y - item.y) < 3) last.text += `${last.text && !last.text.endsWith(' ') ? ' ' : ''}${item.str}`;
      else lines.push({ y: item.y, text: item.str });
    }
    const blockTexts = lines.map(line => line.text.trim()).filter(Boolean);
    pages.push({ text: blockTexts.join('\n'), blocks: blockTexts.map(text => ({ text, kind: /^\s*(?:\d+(?:\.\d+)*|article\s+\d+)[.\s]/i.test(text) ? 'heading' : 'paragraph', sectionLabel: text.match(/^\s*((?:\d+\.)+\d+|\d+|Article\s+\d+)/i)?.[1] ?? null })) });
    progress(i,pdf.numPages);
  }
  const readable = pages.filter(page => page.text.replace(/[^\p{L}\p{N}]/gu, '').length >= 20).length;
  if (pages.map(p => p.text).join('').replace(/[^\p{L}\p{N}]/gu, '').length < 100 || readable / pages.length < 0.3) {
    throw new AppError('no_text', 422, 'This looks like a scanned PDF with no readable text. OCR is not supported yet. Please upload a text-based PDF.');
  }
  return pages;
}

type XmlNode = Record<string, unknown>;
function children(node: unknown, name: string): XmlNode[] {
  if (!Array.isArray(node)) return [];
  return node.flatMap(part => typeof part === 'object' && part !== null && name in part ? (part as XmlNode)[name] as XmlNode[] : []);
}
function xmlText(node: unknown): string {
  if (!Array.isArray(node)) return '';
  return node.map(part => {
    if (typeof part !== 'object' || part === null) return '';
    const entry = part as XmlNode;
    if ('w:del' in entry) return '';
    if ('w:t' in entry) return String((entry['w:t'] as XmlNode[])?.[0]?.['#text'] ?? '');
    if ('w:tab' in entry) return '\t';
    if ('w:br' in entry) return '\n';
    return Object.entries(entry).filter(([key]) => key !== ':@').map(([,value]) => xmlText(value)).join('');
  }).join('');
}
async function extractDocx(buffer: Buffer): Promise<ExtractPage[]> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new AppError('corrupt', 422, 'The DOCX document body is missing.');
  const parsed = new XMLParser({ preserveOrder: true, ignoreAttributes: false }).parse(xml) as XmlNode[];
  const body = children(children(parsed, 'w:document'), 'w:body');
  const blocks: ExtractPage['blocks'] = [];
  for (const item of body) {
    if ('w:p' in item) {
      const text = xmlText(item['w:p']).trim();
      if (text) blocks.push({ text, kind: /^\d+(?:\.\d+)*[.\s]/.test(text) ? 'heading' : 'paragraph', sectionLabel: text.match(/^((?:\d+\.)+\d+|\d+)/)?.[1] ?? null });
    } else if ('w:tbl' in item) {
      let row = 0;
      for (const rowNode of item['w:tbl'] as XmlNode[]) {
        if (!('w:tr' in rowNode)) continue;
        row++;
        let col = 0;
        for (const cellNode of rowNode['w:tr'] as XmlNode[]) {
          if (!('w:tc' in cellNode)) continue;
          col++;
          const text = xmlText(cellNode['w:tc']).trim();
          if (text) blocks.push({ text: `Cell r${row}c${col}: ${text}`, kind: 'table_cell', sectionLabel: null });
        }
      }
    }
  }
  if (blocks.length === 0) throw new AppError('no_text', 422, 'This DOCX contains no readable text.');
  const pages: ExtractPage[] = [];
  let current: ExtractPage['blocks'] = [];
  let length = 0;
  for (const block of blocks) {
    if (current.length && length + block.text.length > 3000) {
      pages.push({ text: current.map(b => b.text).join('\n'), blocks: current });
      current = []; length = 0;
    }
    current.push(block); length += block.text.length + 1;
  }
  if (current.length) pages.push({ text: current.map(b => b.text).join('\n'), blocks: current });
  return pages;
}

export async function processDocument(id: string): Promise<void> {
  const doc = repo.getDocument(id);
  if (!doc || doc.status === 'ready') return;
  db.prepare("UPDATE documents SET status='extracting', updated_at=? WHERE id=?").run(new Date().toISOString(), id);
  try {
    const buffer = await fs.readFile(doc.source_path);
    const progress=(done:number,total:number)=>db.prepare('UPDATE documents SET progress_done=?,progress_total=?,updated_at=? WHERE id=?').run(done,total,new Date().toISOString(),id);
    const pages = doc.mime === 'application/pdf' ? await extractPdf(buffer,progress) : await extractDocx(buffer);
    db.prepare("UPDATE documents SET status='indexing',progress_done=?,progress_total=?, updated_at=? WHERE id=?").run(pages.length,pages.length,new Date().toISOString(), id);
    let fullText = '';
    const pageRows: {id:string;page:number;start:number;end:number;text:string}[] = [];
    const blockRows: {id:string;page:number;idx:number;kind:string;label:string|null;start:number;end:number;text:string}[] = [];
    for (let pageNo = 0; pageNo < pages.length; pageNo++) {
      const page = pages[pageNo]!;
      if (pageNo) fullText += '\n';
      const start = fullText.length;
      for (let i=0;i<page.blocks.length;i++) {
        const block = page.blocks[i]!;
        if (i) fullText += '\n';
        const blockStart=fullText.length;
        fullText += block.text.normalize('NFC');
        blockRows.push({id:crypto.randomUUID(),page:pageNo+1,idx:blockRows.length,kind:block.kind,label:block.sectionLabel,start:blockStart,end:fullText.length,text:block.text.normalize('NFC')});
      }
      pageRows.push({id:crypto.randomUUID(),page:pageNo+1,start,end:fullText.length,text:fullText.slice(start)});
    }
    const chunks: {id:string;page:number;start:number;end:number;text:string}[]=[];
    for(let start=0;start<fullText.length;start+=1300) {
      const end=Math.min(fullText.length,start+1600);
      chunks.push({id:crypto.randomUUID(),page:pageRows.findLast(p=>p.start<=start)?.page ?? 1,start,end,text:fullText.slice(start,end)});
    }
    db.transaction(() => {
      db.prepare('DELETE FROM chunks_fts WHERE document_id=?').run(id);
      db.prepare('DELETE FROM chunks WHERE document_id=?').run(id);
      db.prepare('DELETE FROM doc_blocks WHERE document_id=?').run(id);
      db.prepare('DELETE FROM doc_pages WHERE document_id=?').run(id);
      db.prepare('DELETE FROM document_text WHERE document_id=?').run(id);
      db.prepare('INSERT INTO document_text(document_id,full_text,version) VALUES(?,?,1)').run(id,fullText);
      const ip=db.prepare('INSERT INTO doc_pages(id,document_id,page_no,start_offset,end_offset,text) VALUES(?,?,?,?,?,?)');
      for(const p of pageRows) ip.run(p.id,id,p.page,p.start,p.end,p.text);
      const ib=db.prepare('INSERT INTO doc_blocks(id,document_id,page_no,order_idx,kind,section_label,start_offset,end_offset,text) VALUES(?,?,?,?,?,?,?,?,?)');
      for(const b of blockRows) ib.run(b.id,id,b.page,b.idx,b.kind,b.label,b.start,b.end,b.text);
      const ic=db.prepare('INSERT INTO chunks(id,document_id,page_no,start_offset,end_offset,text) VALUES(?,?,?,?,?,?)');
      const iff=db.prepare('INSERT INTO chunks_fts(chunk_id,document_id,text) VALUES(?,?,?)');
      for(const c of chunks){ic.run(c.id,id,c.page,c.start,c.end,c.text);iff.run(c.id,id,c.text);}
      db.prepare("UPDATE documents SET status='ready',page_count=?,char_count=?,failure_code=NULL,failure_message=NULL,updated_at=? WHERE id=?").run(pageRows.length,fullText.length,new Date().toISOString(),id);
    })();
  } catch(error) {
    const appError=error instanceof AppError?error:new AppError('corrupt',422,'This file could not be processed.');
    db.prepare("UPDATE documents SET status='failed',failure_code=?,failure_message=?,updated_at=? WHERE id=?").run(appError.code,appError.userMessage,new Date().toISOString(),id);
  }
}

const active=new Set<string>();
export function queueDocument(id:string):void {
  if(active.has(id))return;
  active.add(id);
  void processDocument(id).finally(()=>active.delete(id));
}
