import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { ClientUpdateSchema } from '@/lib/schemas';

export const GET = withAuth(async (_req, { params: _params }) => {
  const params = await _params;
  const [client, sessions] = await Promise.all([
    pool.query('SELECT * FROM clients WHERE id=$1', [params.id]),
    pool.query(`
      SELECT s.id, s.started_at, s.ended_at, s.duration_min, s.mode,
             s.total_amount, s.status, s.payment_status,
             st.name AS station_name, st.console,
             r.name  AS rate_name
      FROM sessions s
      JOIN stations st ON st.id = s.station_id
      LEFT JOIN rates r ON r.id = s.rate_id
      WHERE s.client_id = $1
      ORDER BY s.started_at DESC LIMIT 50
    `, [params.id]),
    // Top games (by console/station)
  ]);
  if (!client.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Game stats: group sessions by console
  const gameStats = sessions.rows.reduce<Record<string, { count: number; total: number }>>((acc, s) => {
    const key = s.console || s.station_name || 'Other';
    if (!acc[key]) acc[key] = { count: 0, total: 0 };
    acc[key].count++;
    acc[key].total += Number(s.total_amount);
    return acc;
  }, {});

  return NextResponse.json({
    client: client.rows[0],
    sessions: sessions.rows,
    gameStats,
  });
});

export const PUT = withAuth(async (req, { params: _params }) => {
  const params = await _params;
  const body = ClientUpdateSchema.parse(await req.json());
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (body.name  !== undefined) { sets.push(`name=$${i++}`);  vals.push(body.name); }
  if (body.phone !== undefined) { sets.push(`phone=$${i++}`); vals.push(body.phone || null); }
  if (body.email !== undefined) { sets.push(`email=$${i++}`); vals.push(body.email || null); }
  if (body.notes !== undefined) { sets.push(`notes=$${i++}`); vals.push(body.notes || null); }
  sets.push(`updated_at=NOW()`);
  vals.push(params.id);
  const { rows } = await pool.query(
    `UPDATE clients SET ${sets.join(',')} WHERE id=$${i} RETURNING *`,
    vals
  );
  return NextResponse.json(rows[0]);
});

export const DELETE = withAuth(async (_req, { params: _params }) => {
  const params = await _params;
  await pool.query('UPDATE clients SET is_active=FALSE WHERE id=$1', [params.id]);
  return NextResponse.json({ ok: true });
}, { adminOnly: true });
