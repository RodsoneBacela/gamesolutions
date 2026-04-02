import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';

// PATCH /api/sessions/[id]/subtract-game
// Subtrai 1 jogo dos jogos restantes da sessão
export const PATCH = withAuth(async (_req, { params: _params }) => {
  const params = await _params;
  const { rows } = await pool.query(
    `UPDATE sessions
     SET games_remaining = GREATEST(0, games_remaining - 1)
     WHERE id = $1 AND status = 'Active'
     RETURNING id, games_remaining, games_total, client_name`,
    [params.id]
  );
  if (!rows[0]) {
    return NextResponse.json({ error: 'Sessão não encontrada ou inactiva' }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
});
