import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const PATCH = withAuth(async (req, { params: _params }) => {
  const params = await _params;
  const { extra_minutes, rate_id } = await req.json();
  if (!extra_minutes || extra_minutes <= 0) {
    return NextResponse.json({ error: 'extra_minutes must be positive' }, { status: 400 });
  }

  let extra_cost = 0;
  if (rate_id) {
    const { rows } = await pool.query('SELECT amount FROM rates WHERE id=$1', [rate_id]);
    if (rows[0]) extra_cost = Number(rows[0].amount);
  }

  const { rows } = await pool.query(`
    UPDATE sessions SET
      duration_min = duration_min + $2,
      expected_end_at = expected_end_at + ($2::int * INTERVAL '1 minute'),
      total_amount = total_amount + $3
    WHERE id=$1 AND status='Active'
    RETURNING *
  `, [params.id, extra_minutes, extra_cost]);
  if (!rows[0]) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
});
