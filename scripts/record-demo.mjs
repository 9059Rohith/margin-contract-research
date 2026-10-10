import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const out = path.resolve('docs/demo.webm');
const started = Date.now();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: path.resolve('tmp/demo-video'), size: { width: 1440, height: 900 } },
});
const page = await context.newPage();

function caption(text) {
  return page.evaluate(value => {
    let element = document.querySelector('#demo-caption');
    if (!element) {
      element = document.createElement('div');
      element.id = 'demo-caption';
      element.style.cssText = 'position:fixed;z-index:1000;left:50%;bottom:20px;transform:translateX(-50%);max-width:930px;padding:13px 22px;border:1px solid #b9eb65;border-radius:11px;background:rgba(12,27,44,.96);color:#fff;font:600 18px/1.4 Arial,sans-serif;text-align:center;box-shadow:0 12px 38px #07152266;pointer-events:none';
      document.body.append(element);
    }
    element.textContent = value;
  }, text);
}
async function scene(text, ms) { await caption(text); await page.waitForTimeout(ms); }
async function upload(name) {
  await page.locator('#upload-input').setInputFiles(path.resolve('tests/fixtures', name));
  await page.getByRole('heading', { name }).waitFor();
  await page.locator('.reader-header .status-badge.ready').waitFor({ timeout: 90000 });
}

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await scene('Margin · Read the clause. Verify the answer.', 8000);
  await scene('Upload PDF or DOCX contracts into a saved library. Processing and errors remain visible.', 9000);
  await upload('msa-v1.docx');
  await scene('The first contract is extracted and ready to research.', 12000);

  await page.getByRole('textbox', { name: 'Ask a question' }).fill('What is the liability cap?');
  await scene('Ask a natural-language question. The live model researches the document through read-only tools.', 8000);
  await page.getByRole('button', { name: 'Send question' }).click();
  await caption('Agentic research streams its search and reading steps while the answer is prepared.');
  const evidence = page.locator('.evidence-card').last();
  await evidence.waitFor({ timeout: 90000 });
  await scene('A quote appears as Verified only after the application locates it in this exact document.', 16000);
  await evidence.click();
  await page.locator('mark[data-citation-target="true"]').first().waitFor();
  await scene('Clicking the evidence opens and highlights the cited passage.', 16000);

  await upload('cross-page-duplicate.pdf');
  await page.locator('.pdf-canvas-page canvas').first().waitFor({ timeout: 90000 });
  await scene('PDFs open on their original rendered pages, with an extracted-text option beside them.', 12000);
  await page.getByRole('textbox', { name: 'Ask a question' }).fill('What does the Supplier indemnify the Client for?');
  await page.getByRole('button', { name: 'Send question' }).click();
  const pdfEvidence = page.locator('.evidence-card').last();
  await pdfEvidence.waitFor({ timeout: 90000 });
  await scene('The quote is checked against this PDF before it receives a Verified badge.', 11000);
  await pdfEvidence.click();
  await page.locator('.pdf-citation-highlight').first().waitFor({ timeout: 30000 });
  await scene('Open the evidence to see the exact passage highlighted on the original PDF.', 14000);
  if (await page.getByRole('button', { name: 'Next occurrence' }).count()) {
    await page.getByRole('button', { name: 'Next occurrence' }).click();
    await page.locator('.pdf-citation-highlight').first().waitFor({ timeout: 30000 });
    await scene('Repeated wording is navigable, so the reader can inspect each occurrence.', 9000);
  }

  await upload('msa-v2.docx');
  await page.getByRole('button', { name: 'Select msa-v1.docx for multiple document research' }).last().click();
  await page.getByRole('button', { name: 'Select msa-v2.docx for multiple document research' }).last().click();
  await scene('Select two versions to compare obligations clause by clause.', 12000);
  await page.getByRole('button', { name: 'Compare these versions' }).click();
  await page.getByRole('dialog', { name: 'Document comparison' }).waitFor();
  await scene('The comparison ranks substantive changes, including the liability cap moving from AED 100,000 to AED 1,000,000.', 18000);
  await page.getByRole('button', { name: /1 high/i }).click();
  await scene('Filter to high-significance changes and inspect the before and after wording.', 16000);
  await scene('Part C: the bounded multi-round research loop shows each tool step and verifies final quotes.', 13000);
  await scene('Known limits: scanned PDFs need OCR; unusual PDF layouts use a clearly labelled extracted-text fallback.', 13000);

  const remaining = Math.max(0, 210000 - (Date.now() - started));
  if (remaining) await scene('Margin · Live app, source code, setup instructions, and engineering note are linked in the README.', remaining);
  const duration = Math.round((Date.now() - started) / 1000);
  if (duration > 300) throw new Error(`Demo exceeded five minutes: ${duration}s`);
  await context.close();
  await browser.close();
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.copyFile(await page.video().path(), out);
  console.log(`Saved ${out} (${duration}s)`);
} catch (error) {
  await context.close();
  await browser.close();
  throw error;
}
