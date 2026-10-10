import { beforeAll,describe,expect,it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const conversationId='66666666-6666-4666-8666-666666666666';
const messageId='77777777-7777-4777-8777-777777777777';

beforeAll(async()=>{
  process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'margin-stop-'));
  const {db}=await import('../src/lib/db');
  await db.batch([
    {sql:'INSERT INTO conversations(id,title,scope,created_at) VALUES(?,?,?,?)',args:[conversationId,'Stop test','single',new Date().toISOString()]},
    {sql:"INSERT INTO messages(id,conversation_id,role,content,status,created_at) VALUES(?,?,? ,?,'streaming',?)",args:[messageId,conversationId,'assistant','',new Date().toISOString()]},
  ]);
});

describe('stop and save partial answer',()=>{
  it('persists the visible partial and prevents a late final write',async()=>{
    const {POST}=await import('../src/app/api/chat/stop/route');
    const {db}=await import('../src/lib/db');
    const request=new Request('http://localhost:3000/api/chat/stop',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messageId,content:'Visible partial answer'})});
    expect((await POST(request)).status).toBe(200);
    const late=await db.prepare("UPDATE messages SET content=?,status='complete' WHERE id=? AND status='streaming'").run('Late final answer',messageId);
    expect(late.rowsAffected).toBe(0);
    const saved=await db.prepare('SELECT content,status FROM messages WHERE id=?').get(messageId);
    expect(saved?.content).toBe('Visible partial answer');
    expect(saved?.status).toBe('stopped');
  });
});
