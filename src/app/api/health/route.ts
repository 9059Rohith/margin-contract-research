import { db } from '@/lib/db';
export const runtime='nodejs';
export async function GET(){db.prepare('SELECT 1').get();return Response.json({ok:true});}
