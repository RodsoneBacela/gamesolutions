import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashRefreshToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const raw = req.cookies.get('gs_refresh')?.value;
  if (raw) {
    const hash = hashRefreshToken(raw);
    await pool.query('DELETE FROM refresh_tokens WHERE token_hash=$1', [hash]);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('gs_refresh');
  return res;
}
