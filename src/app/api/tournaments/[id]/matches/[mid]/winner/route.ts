import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { withTransaction } from '@/lib/db';

// PATCH /api/tournaments/[id]/matches/[mid]/winner
// Define o vencedor de uma partida e actualiza stats
export const PATCH = withAuth(async (req, { params: _params }) => {
  const params = await _params;
  const { winner_id, score1, score2 } = await req.json();

  if (!winner_id) return NextResponse.json({ error: 'winner_id required' }, { status: 400 });

  const result = await withTransaction(async (client) => {
    // Get match
    const { rows: matches } = await client.query(
      'SELECT * FROM tournament_matches WHERE id=$1 AND tournament_id=$2',
      [params.mid, params.id]
    );
    const match = matches[0];
    if (!match) throw new Error('Match not found');

    const loserId = winner_id === match.player1_id ? match.player2_id : match.player1_id;

    // Update match
    await client.query(
      `UPDATE tournament_matches SET winner_id=$1, score1=$2, score2=$3, status='Done' WHERE id=$4`,
      [winner_id, score1 ?? null, score2 ?? null, params.mid]
    );

    if (match.phase === 'group') {
      // Update group stats — winner gets 3 points
      await client.query(
        `UPDATE tournament_players SET group_wins=group_wins+1, group_points=group_points+3 WHERE id=$1`,
        [winner_id]
      );
      await client.query(
        `UPDATE tournament_players SET group_losses=group_losses+1 WHERE id=$1`,
        [loserId]
      );
    } else {
      // Knockout — loser is eliminated
      await client.query(
        `UPDATE tournament_players SET is_eliminated=TRUE WHERE id=$1`,
        [loserId]
      );
    }

    return { match, winner_id, loser_id: loserId };
  });

  return NextResponse.json(result);
});
