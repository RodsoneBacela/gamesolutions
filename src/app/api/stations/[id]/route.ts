import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (_req, { params: _params }) => {
  const params = await _params;
  const { rows } = await pool.query('SELECT * FROM stations WHERE id=$1', [params.id]);
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
});

export const PUT = withAuth(async (req, { params: _params }) => {
  const params = await _params;
  const { name, console: cons, description, is_active } = await req.json();
  const { rows } = await pool.query(
    'UPDATE stations SET name=$1, console=$2, description=$3, is_active=$4 WHERE id=$5 RETURNING *',
    [name, cons, description, is_active, params.id]
  );
  return NextResponse.json(rows[0]);
}, { adminOnly: true });

export const DELETE = withAuth(async (_req, { params: _params }) => {
  const params = await _params;
  const { rows } = await pool.query(
    'SELECT COUNT(*) FROM sessions WHERE station_id=$1', [params.id]
  );
  if (Number(rows[0].count) > 0) {
    await pool.query('UPDATE stations SET is_active=FALSE WHERE id=$1', [params.id]);
    return NextResponse.json({ ok: true, soft: true });
  }
  await pool.query('DELETE FROM stations WHERE id=$1', [params.id]);
  return NextResponse.json({ ok: true });
}, { adminOnly: true });
