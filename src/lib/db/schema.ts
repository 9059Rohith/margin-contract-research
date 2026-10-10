import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(), name: text('name').notNull(), mime: text('mime').notNull(),
  sizeBytes: integer('size_bytes').notNull(), sha256: text('sha256').notNull(),
  status: text('status').notNull(), failureCode: text('failure_code'), failureMessage: text('failure_message'),
  pageCount: integer('page_count').default(0), charCount: integer('char_count').default(0),
  progressDone: integer('progress_done').default(0), progressTotal: integer('progress_total').default(0),
  sourcePath: text('source_path').notNull(), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull()
});

export const pages = sqliteTable('doc_pages', {
  id: text('id').primaryKey(), documentId: text('document_id').notNull(), pageNo: integer('page_no').notNull(),
  startOffset: integer('start_offset').notNull(), endOffset: integer('end_offset').notNull(), text: text('text').notNull()
});

export const blocks = sqliteTable('doc_blocks', {
  id: text('id').primaryKey(), documentId: text('document_id').notNull(), pageNo: integer('page_no').notNull(),
  orderIdx: integer('order_idx').notNull(), kind: text('kind').notNull(), sectionLabel: text('section_label'),
  startOffset: integer('start_offset').notNull(), endOffset: integer('end_offset').notNull(), text: text('text').notNull()
});

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(), title: text('title').notNull(), scope: text('scope').notNull(), createdAt: text('created_at').notNull()
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(), conversationId: text('conversation_id').notNull(), role: text('role').notNull(),
  content: text('content').notNull(), status: text('status').notNull(), citationsJson: text('citations_json').notNull(),
  coverageJson: text('coverage_json').notNull(), createdAt: text('created_at').notNull()
});
