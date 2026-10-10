import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '@/lib/env';

const dir = path.resolve(env.DATA_DIR);
fs.mkdirSync(dir, { recursive: true });
export const db = new Database(path.join(dir, 'margin.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, name TEXT NOT NULL, mime TEXT NOT NULL, size_bytes INTEGER NOT NULL, sha256 TEXT NOT NULL, status TEXT NOT NULL, failure_code TEXT, failure_message TEXT, page_count INTEGER DEFAULT 0, char_count INTEGER DEFAULT 0, progress_done INTEGER DEFAULT 0, progress_total INTEGER DEFAULT 0, source_path TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS documents_hash_idx ON documents(sha256);
CREATE TABLE IF NOT EXISTS document_text (document_id TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE, full_text TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS doc_pages (id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE, page_no INTEGER NOT NULL, start_offset INTEGER NOT NULL, end_offset INTEGER NOT NULL, text TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS pages_doc_idx ON doc_pages(document_id,page_no);
CREATE TABLE IF NOT EXISTS doc_blocks (id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE, page_no INTEGER NOT NULL, order_idx INTEGER NOT NULL, kind TEXT NOT NULL, section_label TEXT, start_offset INTEGER NOT NULL, end_offset INTEGER NOT NULL, text TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS blocks_doc_idx ON doc_blocks(document_id,order_idx);
CREATE TABLE IF NOT EXISTS chunks (id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE, page_no INTEGER NOT NULL, start_offset INTEGER NOT NULL, end_offset INTEGER NOT NULL, text TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS chunks_doc_idx ON chunks(document_id);
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(chunk_id UNINDEXED, document_id UNINDEXED, text, tokenize='unicode61');
CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT NOT NULL, scope TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS conversation_documents (conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE, PRIMARY KEY(conversation_id,document_id));
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, role TEXT NOT NULL, content TEXT NOT NULL, status TEXT NOT NULL, citations_json TEXT NOT NULL DEFAULT '[]', coverage_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id,created_at);
CREATE TABLE IF NOT EXISTS comparisons (id TEXT PRIMARY KEY, doc_a_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE, doc_b_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE, result_json TEXT NOT NULL, created_at TEXT NOT NULL);
`);
const documentColumns=new Set((db.prepare('PRAGMA table_info(documents)').all() as {name:string}[]).map(row=>row.name));
if(!documentColumns.has('progress_done'))db.exec('ALTER TABLE documents ADD COLUMN progress_done INTEGER DEFAULT 0');
if(!documentColumns.has('progress_total'))db.exec('ALTER TABLE documents ADD COLUMN progress_total INTEGER DEFAULT 0');

export type Doc = { id: string; name: string; mime: string; size_bytes: number; sha256: string; status: string; failure_code: string | null; failure_message: string | null; page_count: number; char_count: number; progress_done:number; progress_total:number; source_path: string; created_at: string; updated_at: string };
export type Page = { id: string; document_id: string; page_no: number; start_offset: number; end_offset: number; text: string };
export type Block = { id: string; document_id: string; page_no: number; order_idx: number; kind: string; section_label: string | null; start_offset: number; end_offset: number; text: string };
export type Chunk = { id: string; document_id: string; page_no: number; start_offset: number; end_offset: number; text: string };
export type Conversation = { id: string; title: string; scope: string; created_at: string };
export type Message = { id: string; conversation_id: string; role: string; content: string; status: string; citations_json: string; coverage_json: string; created_at: string };

export const repo = {
  listDocuments: () => db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all() as Doc[],
  getDocument: (id: string) => db.prepare('SELECT * FROM documents WHERE id=?').get(id) as Doc | undefined,
  getFullText: (id: string) => (db.prepare('SELECT full_text FROM document_text WHERE document_id=?').get(id) as {full_text: string}|undefined)?.full_text,
  getPages: (id: string) => db.prepare('SELECT * FROM doc_pages WHERE document_id=? ORDER BY page_no').all(id) as Page[],
  getBlocks: (id: string) => db.prepare('SELECT * FROM doc_blocks WHERE document_id=? ORDER BY order_idx').all(id) as Block[],
  getChunks: (id: string) => db.prepare('SELECT * FROM chunks WHERE document_id=? ORDER BY start_offset').all(id) as Chunk[],
  getConversation: (id: string) => db.prepare('SELECT * FROM conversations WHERE id=?').get(id) as Conversation | undefined,
  getConversationDocuments: (id: string) => db.prepare('SELECT d.* FROM documents d JOIN conversation_documents cd ON cd.document_id=d.id WHERE cd.conversation_id=?').all(id) as Doc[],
  getMessages: (id: string) => db.prepare('SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at').all(id) as Message[],
  getConversations: (docId: string) => db.prepare('SELECT c.* FROM conversations c JOIN conversation_documents cd ON cd.conversation_id=c.id WHERE cd.document_id=? ORDER BY c.created_at DESC').all(docId) as Conversation[]
};

export function deleteDocument(id: string) {
  const doc = repo.getDocument(id);
  if (!doc) return false;
  db.transaction(() => {
    db.prepare('DELETE FROM chunks_fts WHERE document_id=?').run(id);
    db.prepare('DELETE FROM documents WHERE id=?').run(id);
    db.prepare('DELETE FROM conversations WHERE id NOT IN (SELECT DISTINCT conversation_id FROM conversation_documents)').run();
  })();
  try { fs.unlinkSync(doc.source_path); } catch { /* already absent */ }
  return true;
}
