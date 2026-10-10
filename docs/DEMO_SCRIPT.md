# Recorded production walkthrough

The [3:37 narrated demo](https://drive.google.com/file/d/1Kn3XTk8AifESHZtr6lFynVqfSkDcKJJM/view) was recorded from the redesigned live Vercel app with `SMOKE_BASE_URL=https://margin-contract-research.vercel.app npm run record:demo`, then voiced and subtitled with `python scripts/narrate-demo.py`. The [MP4](demo.mp4) has burned-in, timed subtitles; [demo.srt](demo.srt) and the public [WebVTT track](https://margin-contract-research.vercel.app/demo.vtt) are also available.

The recording shows a DOCX upload, a live model-backed question about the liability cap, the verified answer and clicked citation, an original PDF with a verified highlighted quote and repeated-occurrence navigation, a second DOCX upload, and the clause-level comparison filtered to its high-significance change. The PDF question uses a clearly labelled limited extract when model synthesis cannot be verified. Captions explain the bounded Part C research loop and its visible limitations. It uses synthetic contracts from `tests/fixtures` and contains no private contracts or API key.

The automated cross-page and repeated-quote browser test provides deeper evidence than the short recording: it clicks a verified quote spanning the original PDF pages 1–2, then navigates to its second occurrence on page 3. See `tests/e2e/contract-workflow.spec.ts`.

The Google Drive copy has Anyone with the link → Viewer access and needs no sign-in. The [Vercel MP4](https://margin-contract-research.vercel.app/demo.mp4) is a playback fallback. The recording uses synthetic contracts, contains no API key, and the narration is synthetic.
