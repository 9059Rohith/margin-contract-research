import { db } from '@/lib/db';
export const runtime='nodejs';
export async function GET(){try{await db.prepare('SELECT 1').get();return Response.json({ok:true});}catch{return Response.json({ok:false},{status:503});}}
