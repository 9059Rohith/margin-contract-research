# Decisions

- **Part C:** Agentic document research. The tool loop uses five read-only tools and the same quote verification path as ordinary chat. This also supports large contracts without forcing all text into one prompt.
- **Reader:** Show the original rendered PDF by default, with highlights calculated from independently verified source offsets and PDF.js text positions. The extracted-text view remains available for DOCX and as an explicit fallback when an unusual PDF layout cannot be mapped reliably. Cross-page and repeated occurrences are covered by browser tests.
- **Evidence:** Only exact or normalized substring matches earn a Verified label. We do not silently turn paraphrases into quotes. An unsupported quote is removed from the supporting evidence list.
- **Coverage:** Count character ranges returned to the model, not the number of pages indexed. A partial read cannot support a claim that a topic is absent.
- **Storage:** The repository uses libSQL locally and Turso in production, preserving the SQLite schema and FTS5 search while allowing Vercel functions to share persistent records. Original files use local storage in development and private Vercel Blob in production.
- **Search:** SQLite FTS5 retrieves bounded passages. The whole contract is not placed in a model prompt.
- **Comparison:** Clause alignment and numeric significance are deterministic. An amount change in a liability clause is High even without a second model call.
- **Deployment:** Vercel with Turso and private Blob. The previous volume-backed Docker/Railway configuration remains an alternative. Vercel's ephemeral filesystem is not used for user data.
- **No credentials:** If `LLM_API_KEY` is absent, chat returns clearly labelled extractive search results. It does not claim to have run model-based agentic research.
