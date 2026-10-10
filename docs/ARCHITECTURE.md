# Architecture

```mermaid
flowchart LR
  Upload[PDF or DOCX upload] --> Sniff[Magic-byte and size validation]
  Sniff --> Extract[Per-page or paragraph extraction]
  Extract --> Store[(SQLite: documents, pages, blocks, chunks)]
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

The source file, canonical extracted text, pages, blocks and search chunks are stored once. Model messages only receive bounded tool results. Every final citation is independently checked against the correct document's canonical text, then mapped back to blocks for highlighting. Conversation messages persist while streaming so stopped answers remain available.
