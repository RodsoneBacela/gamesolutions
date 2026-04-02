import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { signToken, hashRefreshToken, verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const raw = req.cookies.get('gs_refresh')?.value;
  if (!raw) return NextResponse.json({ error: 'No refresh token' }, { status: 401 });

  const hash = hashRefreshToken(raw);
  const { rows } = await pool.query(
    `SELECT rt.id, rt.user_id, u.username, u.role, u.is_active
     FROM refresh_tokens rt JOIN users u ON u.id=rt.user_id
     WHERE rt.token_hash=$1 AND rt.expires_at > NOW()`,
    [hash]
  );
  const rec = rows[0];
  if (!rec || !rec.is_active) {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
  }

  const access_token = await signToken({ sub: String(rec.user_id), username: rec.username, role: rec.role });
  return NextResponse.json({ access_token });
}
