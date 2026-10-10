# Recorded production walkthrough

The [3:15 captioned demo](https://margin-contract-research.vercel.app/demo.webm) was recorded from the live Vercel app with `SMOKE_BASE_URL=https://margin-contract-research.vercel.app npm run record:demo`. The source recording is [demo.webm](demo.webm).

The recording shows a DOCX upload, a live model-backed question about the liability cap, the verified answer and clicked citation, the original rendered PDF reader, a second DOCX upload, and the clause-level comparison filtered to its high-significance change. Captions explain the bounded Part C research loop and its visible limitations. It uses synthetic contracts from `tests/fixtures` and contains no private contracts or API key.

The automated cross-page and repeated-quote browser test provides deeper evidence than the short recording: it clicks a verified quote spanning the original PDF pages 1–2, then navigates to its second occurrence on page 3. See `tests/e2e/contract-workflow.spec.ts`.

The public recording is served from Vercel so it opens without a sign-in. The assignment names Loom, Google Drive, or unlisted YouTube as submission hosts; the hosting choice remains the sole literal format difference.
