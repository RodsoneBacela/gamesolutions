import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async () => {
  const { rows } = await pool.query('SELECT key, value FROM settings ORDER BY key');
  const obj = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return NextResponse.json(obj);
});

export const PUT = withAuth(async (req) => {
  const body = await req.json() as Record<string, string>;
  for (const [key, value] of Object.entries(body)) {
    await pool.query(
      'INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2',
      [key, value]
    );
  }
  return NextResponse.json({ ok: true });
}, { adminOnly: true });
