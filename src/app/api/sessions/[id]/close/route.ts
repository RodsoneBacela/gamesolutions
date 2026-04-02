import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const PATCH = withAuth(async (_req, { params: _params }) => {
  const params = await _params;
  const { rows } = await pool.query(
    `UPDATE sessions SET status='Closed', ended_at=NOW()
     WHERE id=$1 AND status='Active'
     RETURNING *`,
    [params.id]
  );
  if (!rows[0]) return NextResponse.json({ error: 'Session not found or already closed' }, { status: 404 });
  return NextResponse.json(rows[0]);
});
