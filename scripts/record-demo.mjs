import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const out = path.resolve('tmp/demo-raw.webm');
const cuesOut = path.resolve('tmp/demo-cues.json');
const started = Date.now();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: path.resolve('tmp/demo-video'), size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const videoStarted = Date.now();
const cues = [];

function caption(text) {
  cues.push({ text, startMs: Date.now() - videoStarted });
}
async function scene(text, ms) { caption(text); await page.waitForTimeout(ms); }
async function upload(name) {
  await page.locator('#upload-input').setInputFiles(path.resolve('tests/fixtures', name));
  await page.getByRole('heading', { name }).waitFor();
  await page.locator('.reader-header .status-badge.ready').waitFor({ timeout: 90000 });
}

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await scene('Meet Margin: a contract research workspace for answers you can verify.', 8000);
  await scene('Upload PDF or Word contracts. Each document is saved with a clear processing status.', 9000);
  await upload('msa-v1.docx');
  await scene('The first agreement is ready. Let us ask about its liability cap.', 12000);

  await page.getByRole('textbox', { name: 'Ask a question' }).fill('What is the liability cap?');
  await scene('Ask a question in plain language. The agent searches the contract and reads the relevant clause.', 8000);
  await page.getByRole('button', { name: 'Send question' }).click();
  caption('The research steps appear live, so you can see what the agent checked.');
  const evidence = page.locator('.evidence-card').last();
  await evidence.waitFor({ timeout: 90000 });
  await scene('A quote is marked verified only after Margin finds it in this exact document.', 16000);
  await evidence.click();
  await page.locator('mark[data-citation-target="true"]').first().waitFor();
  await scene('Open the citation to jump directly to the matching wording.', 16000);

  await upload('cross-page-duplicate.pdf');
  await page.locator('.pdf-canvas-page canvas').first().waitFor({ timeout: 90000 });
  await scene('PDFs open on their original pages, with an extracted text option beside them.', 12000);
  await page.getByRole('textbox', { name: 'Ask a question' }).fill('What does the Supplier indemnify the Client for?');
  await page.getByRole('button', { name: 'Send question' }).click();
  const pdfEvidence = page.locator('.evidence-card').last();
  await pdfEvidence.waitFor({ timeout: 90000 });
  await scene('Now the evidence is checked against this PDF before it appears as verified.', 11000);
  await pdfEvidence.click();
  await page.locator('.pdf-citation-highlight').first().waitFor({ timeout: 30000 });
  await scene('The original PDF opens at the cited passage with a precise highlight.', 14000);
  if (await page.getByRole('button', { name: 'Next occurrence' }).count()) {
    await page.getByRole('button', { name: 'Next occurrence' }).click();
    await page.locator('.pdf-citation-highlight').first().waitFor({ timeout: 30000 });
    await scene('When wording repeats, move between occurrences to inspect the right one.', 9000);
  }

  await upload('msa-v2.docx');
  await page.getByRole('button', { name: 'Select msa-v1.docx for multiple document research' }).last().click();
  await page.getByRole('button', { name: 'Select msa-v2.docx for multiple document research' }).last().click();
  await scene('Select two contract versions for a clause level comparison.', 12000);
  await page.getByRole('button', { name: 'Compare these versions' }).click();
  await page.getByRole('dialog', { name: 'Document comparison' }).waitFor();
  await scene('The liability cap rises from one hundred thousand to one million dirhams, and the change is ranked by significance.', 18000);
  await page.getByRole('button', { name: /1 high/i }).click();
  await scene('Filter to high significance changes and inspect the before and after wording.', 16000);
  await scene('The multi-round research loop shows each tool step and verifies quotes in the final answer.', 13000);
  await scene('Known limits: scanned PDFs need OCR, and unusual layouts may use a labelled text fallback.', 13000);

  const remaining = Math.max(0, 210000 - (Date.now() - started));
  if (remaining) await scene('The live app, source code, setup steps, and engineering note are linked in the README.', remaining);
  const duration = Math.round((Date.now() - started) / 1000);
  if (duration > 300) throw new Error(`Demo exceeded five minutes: ${duration}s`);
  await context.close();
  await browser.close();
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.copyFile(await page.video().path(), out);
  await fs.writeFile(cuesOut, JSON.stringify({ durationMs: Date.now() - videoStarted, cues }, null, 2));
  console.log(`Saved ${out} and ${cuesOut} (${duration}s)`);
} catch (error) {
  await context.close();
  await browser.close();
  throw error;
}
