import path from 'node:path';
import { test,expect } from '@playwright/test';

const fixture=(name:string)=>path.resolve('tests','fixtures',name);

test('upload, research with verified quote, and compare two contracts',async({page})=>{
  await page.goto('/');
  await page.locator('#upload-input').setInputFiles(fixture('msa-v1.docx'));
  await expect(page.getByRole('heading',{name:'msa-v1.docx'})).toBeVisible();
  await expect(page.locator('.reader-header .status-badge')).toContainText('Ready');
  await page.getByRole('textbox',{name:'Ask a question'}).fill('What is the liability cap?');
  await page.getByRole('button',{name:'Send question'}).click();
  await expect(page.locator('.evidence-card')).toHaveCount(1);
  await expect(page.locator('.evidence-card')).toContainText('Verified');
  await page.locator('.evidence-card').click();
  await expect(page.locator('mark[data-citation-target="true"]')).toBeVisible();

  await page.locator('#upload-input').setInputFiles(fixture('msa-v2.docx'));
  await expect(page.getByRole('heading',{name:'msa-v2.docx'})).toBeVisible();
  await expect(page.locator('.reader-header .status-badge')).toContainText('Ready');
  await page.getByRole('button',{name:'Select msa-v1.docx for multiple document research'}).click();
  await page.getByRole('button',{name:'Select msa-v2.docx for multiple document research'}).click();
  await page.getByRole('button',{name:'Compare these versions'}).click();
  await expect(page.getByRole('dialog',{name:'Document comparison'})).toBeVisible();
  await expect(page.locator('.change-row:has(.significance.high)')).toHaveCount(1);
  await expect(page.locator('.comparison-summary')).toContainText('high-significance');
});
