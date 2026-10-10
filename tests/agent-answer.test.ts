import { describe,expect,it } from 'vitest';
import { sanitizeAnswer, type Coverage } from '../src/lib/agent/loop';
import type { Citation } from '../src/lib/quotes/verify';

const coverage:Coverage={mode:'agentic',total_chars:100,read_ranges:[],coverage_pct:20,budget_exhausted:false,rounds_used:2,notes:''};
const citation:Citation={id:'Q1',docId:'a',documentName:'Contract',quote:'Liability is capped at AED 100,000.',result:{verified:true,matchType:'exact',occurrences:[{start:0,end:36}],primary:{start:0,end:36},ranges:[{start:0,end:36,page:1}],pages:[1]}};

describe('answer evidence gate',()=>{
  it('keeps cited wording while removing unsupported claims',()=>{
    const answer='Liability is capped at AED 100,000. [Q1] The supplier can terminate at any time.';
    expect(sanitizeAnswer(answer,[citation],coverage,'answered')).toBe('Liability is capped at AED 100,000. [Q1]');
  });
  it('rejects fabricated citation markers and partial-coverage absence claims',()=>{
    expect(sanitizeAnswer('The cap is unlimited [Q2].',[citation],coverage,'answered')).toMatch(/could not verify/i);
    expect(sanitizeAnswer('[Q1]',[citation],coverage,'answered')).toMatch(/could not verify/i);
    expect(sanitizeAnswer('The contract does not contain a termination clause [Q1].',[citation],coverage,'answered')).toMatch(/cannot confirm it is absent/i);
    expect(sanitizeAnswer('The contract does not contain a termination clause [Q1].',[citation],{...coverage,coverage_pct:100,budget_exhausted:true},'answered')).toMatch(/cannot confirm it is absent/i);
  });
});
