import { describe,it,expect } from 'vitest';
import { classify } from '../src/lib/compare';
const unit=(text:string)=>({label:'12.1',title:'Liability',text,start:0,end:text.length,page:1});
describe('comparison significance',()=>{
  it('flags a tenfold liability cap increase high',()=>{const result=classify(unit('12.1 Liability is capped at AED 100,000.'),unit('12.1 Liability is capped at AED 1,000,000.'));expect(result.significance).toBe('high');expect(result.summary).toContain('1,000,000');});
  it('ranks a wording-only change below a money change',()=>{const result=classify(unit('The supplier shall provide reasonable assistance.'),unit('The supplier will provide reasonable assistance.'));expect(['cosmetic','low']).toContain(result.significance);});
  it('treats a removed termination clause as high',()=>{expect(classify(unit('Either party may terminate for convenience.'),null).significance).toBe('high');});
});
