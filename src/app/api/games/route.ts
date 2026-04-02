import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { z } from 'zod';

const GameSchema = z.object({
  name:        z.string().min(1).max(150),
  genre:       z.string().max(80).optional().nullable(),
  platform:    z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  cover_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});

export const GET = withAuth(async (req) => {
  const url    = new URL(req.url);
  const search = url.searchParams.get('search');
  if (search) {
    const { rows } = await pool.query(
      `SELECT * FROM games WHERE is_active=TRUE AND (name ILIKE $1 OR genre ILIKE $1 OR platform ILIKE $1) ORDER BY name`,
      [`%${search}%`]
    );
    return NextResponse.json(rows);
  }
  const { rows } = await pool.query('SELECT * FROM games WHERE is_active=TRUE ORDER BY name');
  return NextResponse.json(rows);
});

export const POST = withAuth(async (req) => {
  const body = GameSchema.parse(await req.json());
  const { rows } = await pool.query(
    `INSERT INTO games (name, genre, platform, description, cover_color)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [body.name, body.genre || null, body.platform || null,
     body.description || null, body.cover_color || '#0ea5e9']
  );
  return NextResponse.json(rows[0], { status: 201 });
});
