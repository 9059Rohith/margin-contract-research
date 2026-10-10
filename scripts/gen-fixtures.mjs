import JSZip from 'jszip';
import fs from 'node:fs/promises';
import path from 'node:path';

const out=path.resolve('tests/fixtures');
await fs.mkdir(out,{recursive:true});
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
async function makeDocx(filename,lines){
  const zip=new JSZip();
  zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/document.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${lines.map(line=>`<w:p><w:r><w:t xml:space="preserve">${escape(line)}</w:t></w:r></w:p>`).join('')}<w:sectPr/></w:body></w:document>`);
  await fs.writeFile(path.join(out,filename),await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
}
const shared=['MASTER SERVICES AGREEMENT','This Master Services Agreement is entered into by Acme Systems and Northstar Labs.','1. Services','The Supplier shall provide software development services described in each statement of work.','2. Payment','Invoices are due within thirty (30) days of receipt.','3. Confidentiality','Each party shall protect Confidential Information using reasonable care and shall not disclose it to any third party without prior written consent.','4. Term and termination','Either party may terminate this Agreement for material breach if the breach remains uncured for thirty (30) days after written notice.'];
await makeDocx('msa-v1.docx',[...shared,'5. Limitation of liability','The Supplier’s total liability under this Agreement shall not exceed AED 100,000.','6. Governing law','This Agreement is governed by the laws of the United Arab Emirates.']);
await makeDocx('msa-v2.docx',[...shared.slice(0,6),'3. Confidentiality','Each party shall protect Confidential Information using reasonable care and may disclose it to approved subcontractors bound by equivalent obligations.',...shared.slice(8),'5. Limitation of liability','The Supplier’s total liability under this Agreement shall not exceed AED 1,000,000.','6. Governing law','This Agreement is governed by the laws of the United Arab Emirates.']);
await fs.writeFile(path.join(out,'not-a-contract.txt'),'This is a text file and should be rejected.');
console.log(`Wrote contract fixtures to ${out}`);
