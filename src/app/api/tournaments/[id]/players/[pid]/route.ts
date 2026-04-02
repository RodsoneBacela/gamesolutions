import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const PATCH = withAuth(async (req, { params: _params }) => {
  const params = await _params;
  const body = await req.json();
  const sets: string[] = [], vals: unknown[] = [];
  let i = 1;
  if (body.station_id    !== undefined) { sets.push(`station_id=$${i++}`);    vals.push(body.station_id); }
  if (body.is_eliminated !== undefined) { sets.push(`is_eliminated=$${i++}`); vals.push(body.is_eliminated); }
  if (body.group_name    !== undefined) { sets.push(`group_name=$${i++}`);    vals.push(body.group_name); }
  if (body.bracket_pos   !== undefined) { sets.push(`bracket_pos=$${i++}`);   vals.push(body.bracket_pos); }
  if (!sets.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  vals.push(params.pid);
  const { rows } = await pool.query(
    `UPDATE tournament_players SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, vals
  );
  return NextResponse.json(rows[0]);
});

export const DELETE = withAuth(async (_req, { params: _params }) => {
  const params = await _params;
  await pool.query('DELETE FROM tournament_players WHERE id=$1', [params.pid]);
  return NextResponse.json({ ok: true });
});
