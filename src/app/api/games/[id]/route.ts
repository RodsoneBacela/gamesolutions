import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { z } from 'zod';

const GameUpdateSchema = z.object({
  name:        z.string().min(1).max(150).optional(),
  genre:       z.string().max(80).optional().nullable(),
  platform:    z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  cover_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  is_active:   z.boolean().optional(),
});

export const GET = withAuth(async (_req, { params: _params }) => {
  const params = await _params;
  const { rows } = await pool.query('SELECT * FROM games WHERE id=$1', [params.id]);
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
});

export const PUT = withAuth(async (req, { params: _params }) => {
  const params = await _params;
  const body = GameUpdateSchema.parse(await req.json());
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (body.name        !== undefined) { sets.push(`name=$${i++}`);        vals.push(body.name); }
  if (body.genre       !== undefined) { sets.push(`genre=$${i++}`);       vals.push(body.genre); }
  if (body.platform    !== undefined) { sets.push(`platform=$${i++}`);    vals.push(body.platform); }
  if (body.description !== undefined) { sets.push(`description=$${i++}`); vals.push(body.description); }
  if (body.cover_color !== undefined) { sets.push(`cover_color=$${i++}`); vals.push(body.cover_color); }
  if (body.is_active   !== undefined) { sets.push(`is_active=$${i++}`);   vals.push(body.is_active); }
  sets.push(`updated_at=NOW()`);
  vals.push(params.id);
  const { rows } = await pool.query(
    `UPDATE games SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, vals
  );
  return NextResponse.json(rows[0]);
});

export const DELETE = withAuth(async (_req, { params: _params }) => {
  const params = await _params;
  await pool.query('UPDATE games SET is_active=FALSE, updated_at=NOW() WHERE id=$1', [params.id]);
  return NextResponse.json({ ok: true });
}, { adminOnly: true });
