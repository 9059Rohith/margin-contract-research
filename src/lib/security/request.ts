import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';

const buckets=new Map<string,{count:number;reset:number}>();

/** A small single-instance guard; deployment must use one replica or an external limiter. */
export function guardMutation(request:Request,kind:'upload'|'blob_token'|'chat'|'compare'|'conversation'|'delete'){
  const origin=request.headers.get('origin');
  const requestOrigin=new URL(request.url).origin;
  const host=request.headers.get('host');
  let sameHost=false;
  try{sameHost=Boolean(origin&&host&&new URL(origin).host===host&&new URL(origin).protocol===new URL(request.url).protocol);}catch{/* invalid Origin is rejected below */}
  if(origin && origin!==requestOrigin && origin!==env.APP_ORIGIN && !sameHost)throw new AppError('invalid_origin',403,'This request came from an unexpected site.');
  const contentType=request.headers.get('content-type')??'';
  if(kind!=='delete'&&(kind==='upload'?!contentType.startsWith('multipart/form-data'):!contentType.startsWith('application/json')))throw new AppError('invalid_content_type',415,'Unsupported request content type.');
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local';
  const key=`${kind}:${ip}`;
  const now=Date.now(),limit=kind==='upload'||kind==='blob_token'?12:kind==='chat'?30:40;
  const current=buckets.get(key);
  if(!current||current.reset<now){buckets.set(key,{count:1,reset:now+60_000});return;}
  current.count++;
  if(current.count>limit)throw new AppError('rate_limited',429,'Too many requests. Please wait a minute and try again.');
}
