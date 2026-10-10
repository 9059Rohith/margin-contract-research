# Production verification — 10 October 2026

Public URL: https://margin-contract-research.vercel.app

The Vercel project has a private Blob store, a Turso database, and a sensitive model key connected for production. The key is held in Vercel environment variables and is not in this repository.

## Automated checks

- `npm run typecheck`, targeted ESLint, and `npm test`: passed; 21 tests across seven files.
- `SMOKE_BASE_URL=https://margin-contract-research.vercel.app npm run smoke`: passed against production with the configured model.
- The production smoke uploaded two DOCX versions, the six-page assignment PDF, a scanned PDF fixture, and a 150-page PDF. It checked processing state, page 120 text and offset lookup, rejection of the scan, a saved single-document answer with a verified quote, a two-document answer with a verified quote from each document, and a High-significance AED 100,000 to AED 1,000,000 change.
- `/api/health` returned `{ "ok": true }`.

## Browser checks

- A 5.3 MB synthetic PDF uploaded through the direct private Blob route and reached Ready with 150 pages.
- A saved verified citation opened the correct DOCX passage and highlighted its exact text.
- The browser showed live research tool activity and streamed answer text. Stop kept a partial draft, which reopened after a full page reload. Stopped drafts are labelled unverified because the final quote check has not run.
- The responsive library was inspected at a 390 × 844 viewport during local verification.

The synthetic files used for these checks contain no private contracts. Failed and padded-upload test records were removed from production after verification. These checks cover the included fixtures, not every possible PDF/DOCX or model response.
