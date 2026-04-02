import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { withTransaction } from '@/lib/db';

// POST — criar partida
export const POST = withAuth(async (req, { params: _params }) => {
  const params = await _params;
  const { phase, round, group_name, player1_id, player2_id } = await req.json();
  const { rows } = await pool.query(
    `INSERT INTO tournament_matches (tournament_id, phase, round, group_name, player1_id, player2_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [params.id, phase, round || 1, group_name || null, player1_id, player2_id]
  );
  return NextResponse.json(rows[0], { status: 201 });
});
