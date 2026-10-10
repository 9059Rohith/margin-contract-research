import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const base=process.env.SMOKE_BASE_URL||'http://localhost:3000';
const out=path.resolve('docs/demo.webm');
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({
  viewport:{width:1440,height:900},deviceScaleFactor:1,
  recordVideo:{dir:path.resolve('tmp/demo-video'),size:{width:1440,height:900}},
});
const page=await context.newPage();
let empty=true;
await page.route('**/api/documents',route=>empty?route.fulfill({status:200,contentType:'application/json',body:'{"documents":[]}'}):route.continue());
await page.goto(base,{waitUntil:'networkidle'});
await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
await page.evaluate(()=>{
  const caption=document.createElement('div');
  caption.id='demo-caption';
  caption.style.cssText='position:fixed;z-index:1000;left:50%;bottom:18px;transform:translateX(-50%);max-width:880px;padding:12px 20px;border-radius:10px;background:rgba(12,27,51,.94);color:#fff;font:600 18px/1.35 Arial,sans-serif;text-align:center;box-shadow:0 6px 22px #0003;pointer-events:none';
  document.body.append(caption);
});
async function scene(text,ms){await page.evaluate(t=>{document.querySelector('#demo-caption').textContent=t;},text);await page.waitForTimeout(ms);}
await scene('Margin · Contract intelligence, grounded in evidence',9000);
await scene('A calm three-panel workspace: library, faithful text reader, and research desk.',12000);
empty=false;
await page.reload({waitUntil:'networkidle'});
await page.evaluate(()=>{
  const caption=document.createElement('div');caption.id='demo-caption';
  caption.style.cssText='position:fixed;z-index:1000;left:50%;bottom:18px;transform:translateX(-50%);max-width:880px;padding:12px 20px;border-radius:10px;background:rgba(12,27,51,.94);color:#fff;font:600 18px/1.35 Arial,sans-serif;text-align:center;box-shadow:0 6px 22px #0003;pointer-events:none';document.body.append(caption);
});
await page.getByRole('button',{name:'msa-v1.docx 1 sections'}).click();
await scene('PDF and DOCX files stay in a saved library. Extraction status and failures are visible.',17000);
await page.locator('#upload-input').setInputFiles('tests/fixtures/not-a-contract.txt');
await page.getByRole('alert').waitFor();
await scene('Unsupported files receive a clear inline error; scanned PDFs with no text are marked failed.',13000);
await page.getByRole('textbox',{name:'Ask a question'}).fill('What is the liability cap?');
await scene('Ask a question in plain language. This recording has no provider key, so the fallback is explicitly labelled.',9000);
await page.getByRole('button',{name:'Send question'}).click();
const evidence=page.getByRole('button',{name:/msa-v1.docx Verified Page 1 Go to passage/}).last();
await evidence.waitFor({timeout:15000});
await scene('Evidence cards appear only after the quoted text is found in the attributed source.',18000);
await evidence.click();
await page.locator('mark[data-citation-target="true"]').first().waitFor();
await page.locator('mark[data-citation-target="true"]').first().scrollIntoViewIfNeeded();
await scene('Click a verified citation to scroll to and highlight the exact passage.',19000);
await page.getByRole('button',{name:'contract-150-pages.pdf 150 pages'}).click();
await scene('A 150-page PDF is indexed and can be opened page by page. The smoke test reads page 120.',18000);
await page.getByRole('button',{name:'msa-v1.docx 1 sections'}).click();
await scene('Research history is saved with the document and can be reopened.',12000);
await page.getByRole('button',{name:'Select msa-v1.docx for multiple document research'}).click();
await page.getByRole('button',{name:'Select msa-v2.docx for multiple document research'}).click();
await scene('Select several documents for one research scope, or compare two versions.',15000);
await page.getByRole('button',{name:/Compare documents/}).first().click();
await page.getByText('Executive summary').waitFor();
await scene('Clause-level comparison aligns the versions and ranks substantive changes.',16000);
await page.getByRole('button',{name:/1 high/i}).click();
await scene('High significance: liability cap changed from AED 100,000 to AED 1,000,000.',18000);
await scene('The before and after wording is shown side by side with verified source links.',14000);
await scene('Current limits: OCR and original-page PDF overlays are not implemented. Live model research needs an API key.',14000);
await context.close();
await browser.close();
await fs.mkdir(path.dirname(out),{recursive:true});
await fs.copyFile(await page.video().path(),out);
console.log(`Saved ${out}`);
