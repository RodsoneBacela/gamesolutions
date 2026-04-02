import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { z } from 'zod';

const TournamentCreateSchema = z.object({
  name:            z.string().min(1).max(150),
  tournament_date: z.string(),
  entry_fee:       z.coerce.number().min(0),
  prize:           z.coerce.number().min(0),
  max_players:     z.coerce.number().int().min(2).refine(n => n % 2 === 0, { message: 'Must be even' }),
  format:          z.enum(['knockout','group_knockout']).default('knockout'),
  num_groups:      z.coerce.number().int().min(2).max(8).default(2),
  notes:           z.string().optional(),
});

export const GET = withAuth(async () => {
  const { rows } = await pool.query('SELECT * FROM tournaments ORDER BY created_at DESC');
  return NextResponse.json(rows);
});

export const POST = withAuth(async (req) => {
  const body = TournamentCreateSchema.parse(await req.json());
  const { rows } = await pool.query(
    `INSERT INTO tournaments (name, tournament_date, entry_fee, prize, max_players, format, num_groups, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [body.name, body.tournament_date, body.entry_fee, body.prize,
     body.max_players, body.format, body.num_groups, body.notes || null]
  );
  return NextResponse.json(rows[0], { status: 201 });
});
