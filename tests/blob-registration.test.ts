import { describe,expect,it } from 'vitest';

describe('private blob registration',()=>{
  it('rejects arbitrary URLs before attempting to download them',async()=>{
    const {POST}=await import('../src/app/api/documents/from-blob/route');
    const request=new Request('http://localhost:3000/api/documents/from-blob',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:'https://example.com/documents/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa.pdf',name:'contract.pdf'})});
    const response=await POST(request);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('invalid_request');
  });
});
