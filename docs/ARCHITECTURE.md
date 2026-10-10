# Architecture

```mermaid
flowchart LR
  Upload[PDF or DOCX upload] --> Blob[(Private Blob for deployed files)]
  Upload --> Sniff[Magic-byte and size validation]
  Blob --> Sniff
  Sniff --> Extract[Per-page or paragraph extraction]
  Extract --> Store[(libSQL / Turso: documents, pages, blocks, chunks)]
  Store --> FTS[FTS5 search]
  Question[Question] --> Agent[Bounded research loop]
  Agent --> FTS
  Agent --> Tools[Read-only page, section, outline and range tools]
  Tools --> Store
  Agent --> Draft[Stream provisional answer]
  Draft --> Verify[Normalize quote and map offsets]
  Verify --> Evidence[Verified citations and coverage]
  Store --> Compare[Clause alignment and materiality rules]
```

The source file is stored locally in development and in private Vercel Blob in production. Files over 4 MB upload directly from the browser to Blob, then the server validates their bytes before registration. Canonical extracted text, pages, blocks and search chunks live in local libSQL or hosted Turso. Model messages receive bounded tool results. Every final citation is independently checked against the correct document's canonical text, then mapped back to blocks for highlighting. The Stop endpoint saves the visible partial answer; late model output cannot overwrite it.
