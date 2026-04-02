import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const activeOnly = url.searchParams.get('active_only') === 'true';
  const q = activeOnly
    ? 'SELECT * FROM stations WHERE is_active=TRUE ORDER BY id'
    : 'SELECT * FROM stations ORDER BY id';
  const { rows } = await pool.query(q);
  return NextResponse.json(rows);
});

export const POST = withAuth(async (req) => {
  const { name, console: cons, description } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const { rows } = await pool.query(
    'INSERT INTO stations (name, console, description) VALUES ($1,$2,$3) RETURNING *',
    [name, cons || null, description || null]
  );
  return NextResponse.json(rows[0], { status: 201 });
}, { adminOnly: true });
