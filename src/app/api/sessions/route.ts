import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { z } from 'zod';

const SessionCreateSchema = z.object({
  station_id:   z.number().int().positive(),
  client_name:  z.string().min(1).max(150),
  client_id:    z.number().int().positive().optional().nullable(),
  mode:         z.enum(['Solo', 'Accompanied']),
  rate_id:      z.number().int().positive(),
  game_id:      z.number().int().positive().optional().nullable(),
  games_total:  z.coerce.number().int().min(0).optional().default(0),
  auto_create_client: z.boolean().optional().default(false),
});

export const GET = withAuth(async (req) => {
  const url        = new URL(req.url);
  const status     = url.searchParams.get('status');
  const start_date = url.searchParams.get('start_date');
  const end_date   = url.searchParams.get('end_date');
  const client_id  = url.searchParams.get('client_id');

  const conds: string[] = [];
  const vals:  unknown[] = [];
  let i = 1;
  if (status)     { conds.push(`s.status=$${i++}`);            vals.push(status); }
  if (start_date) { conds.push(`DATE(s.started_at)>=$${i++}`); vals.push(start_date); }
  if (end_date)   { conds.push(`DATE(s.started_at)<=$${i++}`); vals.push(end_date); }
  if (client_id)  { conds.push(`s.client_id=$${i++}`);         vals.push(client_id); }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await pool.query(`
    SELECT s.*, st.name AS station_name, st.console,
           g.name AS game_name_ref, g.genre AS game_genre,
           c.name AS client_full_name, c.phone AS client_phone
    FROM sessions s
    JOIN stations st ON st.id = s.station_id
    LEFT JOIN games g ON g.id = s.game_id
    LEFT JOIN clients c ON c.id = s.client_id
    ${where}
    ORDER BY s.started_at DESC LIMIT 200
  `, vals);
  return NextResponse.json(rows);
});

export const POST = withAuth(async (req) => {
  const body = SessionCreateSchema.parse(await req.json());

  // Check station not occupied
  const { rows: occ } = await pool.query(
    "SELECT id FROM sessions WHERE station_id=$1 AND status='Active'",
    [body.station_id]
  );
  if (occ.length) return NextResponse.json({ error: 'Station already occupied' }, { status: 409 });

  const { rows: rate } = await pool.query('SELECT * FROM rates WHERE id=$1', [body.rate_id]);
  if (!rate[0]) return NextResponse.json({ error: 'Rate not found' }, { status: 404 });

  // Resolve client_id — use existing or auto-create
  let client_id = body.client_id || null;
  if (!client_id && body.client_name.trim()) {
    // Check if client already exists by name (case-insensitive)
    const { rows: existing } = await pool.query(
      `SELECT id FROM clients WHERE LOWER(name) = LOWER($1) AND is_active = TRUE LIMIT 1`,
      [body.client_name.trim()]
    );
    if (existing.length) {
      client_id = existing[0].id;
    } else {
      // Auto-create new client
      const { rows: newClient } = await pool.query(
        `INSERT INTO clients (name) VALUES ($1) RETURNING id`,
        [body.client_name.trim()]
      );
      client_id = newClient[0].id;
    }
  }

  // Get game name if selected
  let game_name: string | null = null;
  if (body.game_id) {
    const { rows: game } = await pool.query(
      'SELECT name FROM games WHERE id=$1 AND is_active=TRUE', [body.game_id]
    );
    if (game[0]) game_name = game[0].name;
  }

  const games_total = body.games_total ?? 0;
  const total_amount = Number(rate[0].amount);

  const { rows } = await pool.query(`
    INSERT INTO sessions
      (station_id, client_id, client_name, mode, rate_id,
       game_id, game_name, games_total, games_remaining,
       duration_min, total_amount, expected_end_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10, NOW()+($9::int * INTERVAL '1 minute'))
    RETURNING *
  `, [
    body.station_id,
    client_id,
    body.client_name.trim(),
    body.mode,
    body.rate_id,
    body.game_id || null,
    game_name,
    games_total,
    rate[0].duration_min,
    total_amount,
  ]);
  return NextResponse.json(rows[0], { status: 201 });
});
