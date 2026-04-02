import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const POST = withAuth(async (req, { params: _params }) => {
  const params = await _params;
  const { player_name, bracket_pos, group_name } = await req.json();
  if (!player_name) return NextResponse.json({ error: 'player_name required' }, { status: 400 });
  const { rows } = await pool.query(
    'INSERT INTO tournament_players (tournament_id, player_name, bracket_pos, group_name) VALUES ($1,$2,$3,$4) RETURNING *',
    [params.id, player_name, bracket_pos || null, group_name || null]
  );
  return NextResponse.json(rows[0], { status: 201 });
});
