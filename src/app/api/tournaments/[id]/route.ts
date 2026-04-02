import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (_req, { params: _params }) => {
  const params = await _params;
  const [t, players, matches] = await Promise.all([
    pool.query('SELECT * FROM tournaments WHERE id=$1', [params.id]),
    pool.query(`
      SELECT tp.*, s.name AS station_name
      FROM tournament_players tp
      LEFT JOIN stations s ON s.id = tp.station_id
      WHERE tp.tournament_id=$1
      ORDER BY tp.group_name NULLS LAST, tp.group_points DESC, tp.id
    `, [params.id]),
    pool.query(`
      SELECT tm.*,
        p1.player_name AS player1_name,
        p2.player_name AS player2_name,
        pw.player_name AS winner_name
      FROM tournament_matches tm
      LEFT JOIN tournament_players p1 ON p1.id = tm.player1_id
      LEFT JOIN tournament_players p2 ON p2.id = tm.player2_id
      LEFT JOIN tournament_players pw ON pw.id = tm.winner_id
      WHERE tm.tournament_id=$1
      ORDER BY tm.phase DESC, tm.round, tm.id
    `, [params.id]),
  ]);
  if (!t.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ tournament: t.rows[0], players: players.rows, matches: matches.rows });
});

export const PATCH = withAuth(async (req, { params: _params }) => {
  const params = await _params;
  const body = await req.json();
  const sets: string[] = [], vals: unknown[] = [];
  let i = 1;
  const allowed = ['status','name','num_groups'];
  for (const key of allowed) {
    if (body[key] !== undefined) { sets.push(`${key}=$${i++}`); vals.push(body[key]); }
  }
  if (!sets.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  vals.push(params.id);
  const { rows } = await pool.query(
    `UPDATE tournaments SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, vals
  );
  return NextResponse.json(rows[0]);
});
