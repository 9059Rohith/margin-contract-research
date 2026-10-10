# Production verification — 10 October 2026

Public URL: https://margin-contract-research.vercel.app

Redesigned production deployment: `dpl_HK9YEy9gi5MccpRaVfVwmQ7EeMfm` (Ready). The 3:37 video was recorded from this deployment.

The Vercel project has a private Blob store, a Turso database, and a sensitive model key connected for production. The key is held in Vercel environment variables and is not in this repository.

## Automated checks

- `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test`: passed; 22 unit tests across seven files. Generated PDF.js worker code is excluded from lint.
- `npm run test:e2e`: three browser tests passed locally, including a cross-page quote, a repeated occurrence on another page, and a phone-width upload → library → reader path.
- `SMOKE_BASE_URL=https://margin-contract-research.vercel.app npm run smoke`: passed against production with the configured model.
- The production smoke uploaded two DOCX versions, the six-page assignment PDF, a scanned PDF fixture, and a 150-page PDF. It checked processing state, page 120 text and offset lookup, rejection of the scan, a saved single-document answer with a verified quote, a two-document answer with a verified quote from each document, and a High-significance AED 100,000 to AED 1,000,000 change.
- `/api/health` returned `{ "ok": true }`.

## Browser checks

- A 5.3 MB synthetic PDF uploaded through the direct private Blob route and reached Ready with 150 pages.
- After the original-page viewer deployment, a fresh 5.3 MB, 150-page PDF uploaded on production and its original first page rendered through six private source chunks with no browser error. The test document was deleted afterward.
- A live model question about the indemnity provision returned a verified quote, and clicking it highlighted the corresponding words on the original rendered PDF page. This short fixture triggered the app's explicitly labelled verified-extract fallback for synthesis. The production screenshot is [`screenshots/pdf-citation.png`](screenshots/pdf-citation.png); the test PDF was deleted afterward.
- A saved verified citation opened the correct DOCX passage and highlighted its exact text.
- The verified production view is captured in [`screenshots/live-citation.png`](screenshots/live-citation.png).
- The browser showed live research tool activity and streamed answer text. Stop kept a partial draft, which reopened after a full page reload. Stopped drafts are labelled unverified because the final quote check has not run.
- The responsive library was inspected at a 390 × 844 viewport during local verification.
- After the redesign, the public URL returned `200` with `{ "ok": true }` from `/api/health`; the live interface rendered the new visual system. The production recording shows a model-backed DOCX answer with a verified citation, a verified PDF highlight with occurrence navigation, and the comparison filter. The video file was decoded and sampled at six points; its metadata duration is 217.24 seconds.

The synthetic files used for these checks contain no private contracts. Failed and padded-upload test records were removed from production after verification. These checks cover the included fixtures, not every possible PDF/DOCX or model response.
