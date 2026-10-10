# API

All errors use `{ "error": { "code": "...", "message": "..." } }`.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | SQLite health check |
| GET / POST | `/api/documents` | List or upload one PDF/DOCX multipart `file` |
| GET / DELETE | `/api/documents/:id` | Document status or deletion |
| GET | `/api/documents/:id/text?page=N` | One extracted page or DOCX section and blocks |
| GET / POST | `/api/conversations?docId=...` | List or create conversations |
| GET / DELETE | `/api/conversations/:id` | Reopen or delete a conversation |
| POST | `/api/chat/stream` | SSE stream; JSON `conversationId`, `question` |
| POST | `/api/compare` | Compare JSON `docA`, `docB` |

Chat SSE events include `meta`, `status`, `tool_call`, `tool_result`, `delta`, `replace`, `citations`, `coverage`, `done`, and `error`. Text before `replace` is provisional until quote verification completes.
