# Engineering note

I chose **Part C, Option 2: agentic document research** so the model can inspect long contracts through visible, bounded tools. It can search, read a page or numbered section, list clauses, and read a block range. Tool arguments are validated; calls are read-only; round, token, and time caps bound the loop. The hardest problem was preventing narrow searches from sounding exhaustive. The server measures text returned to the agent and limits absence claims when coverage is partial.

**Quote verification runs outside the model.** The server normalizes whitespace and punctuation in each proposed quote and its attributed document, then uses an offset map to locate it in stored text. Only a match in that document earns a Verified badge. Pages and highlights come from application-calculated offsets, never model-supplied positions. Unsupported quotes are removed; a wholly unsupported answer is downgraded. Extraction errors, unusual PDF layouts, linearized DOCX tables, or repeated wording can still reject a true quote or make its visual location uncertain.

For **large documents**, extraction and FTS5 indexing happen once. Tools return bounded passages rather than a 150-page prompt. Coverage reflects passages read, not everything indexed; partial reading cannot prove absence.

The Part C loop, live activity, limits, and final quote check are implemented and fixture-tested. Next I would add OCR, stronger clause alignment and PDF geometry, an exhaustive absence check, and private-workspace authentication.
