# Demo recording and narration plan

The submitted [captioned walkthrough](demo.webm) was captured from the local production build with `npm run record:demo`. It lasts about 3½ minutes and shows the no-key extractive fallback honestly. The outline below is a guide for a future narrated run with a configured provider; it includes additional flows beyond the submitted recording.

Record a 3–5 minute screen capture at 1440×900 or similar, with the app and browser address visible. Use the generated fixtures in `tests/fixtures`. The narration below distinguishes verified behavior from features that need a configured model.

| Time | Action and narration |
|---|---|
| 0:00–0:30 | Open the empty library. Upload `msa-v1.docx`. Show the status changing from queued/extracting/indexing to ready. Point out the extracted reader and saved library row. |
| 0:30–0:50 | Try `not-a-contract.txt`; show the inline supported-format error. Upload `scanned-no-text.pdf`; show the explicit no-text failure. |
| 0:50–1:35 | With `LLM_API_KEY` configured, ask “What is the liability cap?” Show the live research activity and answer tokens. Mention that quote cards appear only after server verification. If no key is configured, show the clearly labelled extractive fallback and state its limitation. |
| 1:35–2:05 | Open a verified quote. Show scroll and highlighting in the extracted reader. Ask a second question and reopen its saved conversation from Research history. |
| 2:05–2:35 | Upload `contract-150-pages.pdf`; ask about the liability cap. Show the page-120 evidence and coverage indicator. Explain that a partial read cannot prove a clause is absent. |
| 2:35–3:10 | Upload `msa-v2.docx`, select both documents, ask across them, then click a quote to open its own source. |
| 3:10–3:45 | Compare the versions. Filter to High significance and show the liability cap changing from AED 100,000 to AED 1,000,000. Open before and after passages. |
| 3:45–4:10 | Show the research activity timeline and the Part C tool list in `docs/ARCHITECTURE.md`. Close by naming current limits: no OCR, text-faithful rather than original-page overlay, and live-model behavior requiring provider validation. |

Do not claim that a live model call, partial-answer stop persistence, cross-page highlights, or deployment works in the recording unless that behavior is actually shown on the recorded build.
