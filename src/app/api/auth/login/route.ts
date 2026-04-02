import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { signToken, generateRefreshToken, hashRefreshToken } from '@/lib/auth';
import { LoginSchema } from '@/lib/schemas';

const attempts = new Map<string, { count: number; reset: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && now < rec.reset && rec.count >= 10) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  }

  try {
    const body = LoginSchema.parse(await req.json());
    const { rows } = await pool.query(
      'SELECT id, username, password_hash, role, is_active FROM users WHERE username=$1',
      [body.username]
    );
    const user = rows[0];
    const valid = user && await bcrypt.compare(body.password, user.password_hash);

    if (!user || !valid) {
      const cur = attempts.get(ip) ?? { count: 0, reset: now + 900000 };
      cur.count++;
      attempts.set(ip, cur);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    if (!user.is_active) return NextResponse.json({ error: 'Account disabled' }, { status: 403 });

    attempts.delete(ip);
    await pool.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);

    const access_token = await signToken({ sub: String(user.id), username: user.username, role: user.role });
    const refreshRaw   = generateRefreshToken();
    const refreshHash  = hashRefreshToken(refreshRaw);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,NOW()+INTERVAL\'7 days\')',
      [user.id, refreshHash]
    );

    const res = NextResponse.json({
      access_token,
      user: { id: user.id, username: user.username, role: user.role },
    });
    res.cookies.set('gs_refresh', refreshRaw, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 604800, path: '/',
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
