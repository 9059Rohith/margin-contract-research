# Assignment requirements and evidence

Source: `hiring assignment.pdf`, six pages. The quoted requirements below retain the assignment's wording. Status means **observed behavior**, not intent; update it after running tests.

| ID | Original requirement | Implementation | Evidence | Status |
|---|---|---|---|---|
| A1 | "Accept PDF and DOCX. Reject other file types with a clear message." | `src/app/api/documents/route.ts`, `src/lib/extract/index.ts` | API smoke test | Finished |
| A2 | "Extract the text and store it." | `src/lib/extract/index.ts`, `src/lib/db/index.ts` | API smoke test | Finished |
| A3 | "Show processing status while it happens. The user should never be left wondering whether anything is happening." | library and reader status states | browser walkthrough | Finished |
| A4 | "Handle a scanned PDF with no readable text properly: tell the user, rather than saving an empty document and treating it as successful." | `extractPdf` | scan fixture test | Finished |
| A5 | "A document library where uploaded files are listed, opened and deleted." | documents API and library | browser walkthrough | Finished |
| A6 | "Ask questions about an uploaded document and get answers." | agent, chat SSE | mocked/real provider test | Partial |
| A7 | "Answers stream in as they are generated, not all at once at the end." | `src/lib/agent/loop.ts`, SSE | streaming test | Partial |
| A8 | "The user can stop an answer while it is being written, and whatever was generated is kept." | AbortController, explicit stop endpoint, guarded message persistence | `tests/chat-stop.test.ts`; live browser stop pending | Partial |
| A9 | "Chat history is saved per document and can be reopened." | conversations API and library history | browser walkthrough | Finished |
| A10 | "Before a quote is shown to the user, your code must confirm that the quote actually exists in the document text." | `src/lib/quotes` | `tests/quotes.test.ts` | Finished |
| A11 | "Quote found: show it as verified, and let the user open it in the document." | `Evidence`, `Reader` | quote click test | Finished |
| A12 | "Quote not found: the AI invented or paraphrased it. It must never be presented as if it were genuine. Remove it, or mark it clearly as unverified." | answer sanitizer, evidence list | quote test | Partial |
| A13 | "Do not trust any position, page number or offset the AI reports. Locate the quote in the text yourself." | matcher derives offsets | unit test | Finished |
| A14 | "Allow for whitespace differences." | normalization and offset map | `tests/quotes.test.ts` | Finished |
| A15 | "If the answer is not in the document, the app must say so instead of inventing one." | answer sanitizer and coverage guard | integration test | Partial |
| A16 | "A 150-page contract must work." | PDF extraction/page cap, FTS chunks | large fixture | Finished |
| A17 | "if your app only read part of a document, it must not answer as though it read all of it." | coverage read ranges, negative claim guard | agent test | Partial |
| B5 | "Clicking a quote in an answer opens the document, scrolls to that passage and highlights it." | `Reader.tsx` | browser walkthrough | Finished |
| B5a | "Handle quotes that span multiple lines, cross a page break, or appear more than once." | matcher segments, occurrence navigator | quote unit test/browser | Partial |
| B6 | "The user selects several documents and asks one question across all of them." | library selection, multi scope | browser walkthrough | Partial |
| B6a | "Each quote identifies which document it came from." | citation schema/card | browser walkthrough | Finished |
| B6b | "The answer compares across documents rather than listing separate answers." | multi scope prompt | live provider check | Partial |
| B6c | "Each quote is verified against its own document, not the whole set." | `verifyCitations` | integration test | Partial |
| B7 | "Upload two versions of a contract and see what changed." | compare API/modal | browser walkthrough | Finished |
| B7a | "Differences at clause or paragraph level, not a character diff." | clause alignment | compare test | Finished |
| B7b | "A plain-language summary of what changed in substance." | deterministic summary | compare test | Finished |
| B7c | "Filter or sort by how significant a change is." | significance filter and ordered results | browser walkthrough | Finished |
| C2a | "A real multi-round loop: the model can call tools, read results, and call more." | `src/lib/agent/loop.ts` | scripted provider test | Partial |
| C2b | "Show what it is doing as it happens ... not a spinner." | SSE tool/status events and activity timeline | browser walkthrough | Partial |
| C2c | "A hard cap on rounds, so it cannot loop forever or run up an unbounded bill." | `AGENT_MAX_ROUNDS`, token budget | loop test | Partial |
| C2d | "Malformed or invented tool calls ... handled without crashing the request." | zod tool validation | `tests/agent-tools.test.ts` | Finished |
| C2e | "Verified quotes still apply to the final answer." | final verification | integration test | Partial |
| S1 | "Read the API key, base URL and model name from environment variables." | `src/lib/env.ts` | config inspection | Finished |
| S2 | "Do not commit API keys to the repository." | `.gitignore`, `.env.example` | staged paths and credential-pattern scan | Finished |
| D1 | "GitHub repository link." | `https://github.com/9059Rohith/margin-contract-research` | remote content check | Finished |
| D2 | "Deployed link. A working, live version we can open and use." | Vercel, private Blob, Turso adapter | Vercel UI returns 200, deployed API fails until Turso is installed; local production smoke passes | Blocked externally |
| D3 | "README containing ... Screenshots ... How to run it locally ... What is finished and what is not" | `README.md` | document review | Finished |
| D4 | "Demo video (3 to 5 minutes)." | `docs/demo.webm`, `scripts/record-demo.mjs` | captioned production recording | Finished |
| D5 | "A short note (half a page) covering ..." | `docs/NOTE.md` | document review | Finished |

## Traceability rule

The table is the traceability matrix: ID → implementation → test/verification → status. A row moves to Finished only after the named check passes. Partial and unavailable items stay explicit in the README.
