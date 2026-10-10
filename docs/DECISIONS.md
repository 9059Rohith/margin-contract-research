# Decisions

- **Part C:** Agentic document research. The tool loop uses five read-only tools and the same quote verification path as ordinary chat. This also supports large contracts without forcing all text into one prompt.
- **Reader:** Show extracted, text-faithful pages as the primary document view. Citation offsets map directly to this representation, including across page boundaries. A rendered PDF overlay is deferred because text extraction geometry is not reliably equivalent to browser rendering.
- **Evidence:** Only exact or normalized substring matches earn a Verified label. We do not silently turn paraphrases into quotes. An unsupported quote is removed from the supporting evidence list.
- **Coverage:** Count character ranges returned to the model, not the number of pages indexed. A partial read cannot support a claim that a topic is absent.
- **Storage:** SQLite WAL in a mounted directory keeps single-user operation simple. The application uses a small repository layer. The full data directory must persist across deploys.
- **Search:** SQLite FTS5 retrieves bounded passages. The whole contract is not placed in a model prompt.
- **Comparison:** Clause alignment and numeric significance are deterministic. An amount change in a liability clause is High even without a second model call.
- **Deployment:** Docker on Railway or Render with a persistent volume. Vercel ephemeral file storage is unsuitable for this SQLite/file design.
- **No credentials:** If `LLM_API_KEY` is absent, chat returns clearly labelled extractive search results. It does not claim to have run model-based agentic research.
