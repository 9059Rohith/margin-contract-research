import { describe,it,expect } from 'vitest';
import { executeTool } from '../src/lib/agent/tools';
const id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
describe('agent tool validation',()=>{
  it('returns structured errors for invented names and malformed JSON',async()=>{expect((await executeTool('delete_document','{}',[id])).ok).toBe(false);expect((await executeTool('search_document','{bad',[id])).ok).toBe(false);});
  it('rejects missing, wrong-type and giant arguments',async()=>{expect((await executeTool('search_document','{}',[id])).ok).toBe(false);expect((await executeTool('get_page','{"page":"five"}',[id])).ok).toBe(false);expect((await executeTool('search_document','x'.repeat(3001),[id])).ok).toBe(false);});
  it('rejects documents outside the selected scope',async()=>{const other='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';expect((await executeTool('list_clauses',JSON.stringify({doc_id:other}),[id])).ok).toBe(false);});
});
