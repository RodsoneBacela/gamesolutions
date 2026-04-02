import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { ClientCreateSchema } from '@/lib/schemas';

export const GET = withAuth(async (req) => {
  const url    = new URL(req.url);
  const search = url.searchParams.get('search');
  const limit  = parseInt(url.searchParams.get('limit') || '100');

  if (search) {
    const { rows } = await pool.query(
      `SELECT id, name, phone, email, total_sessions, total_spent, last_visit
       FROM clients WHERE is_active=TRUE
       AND (name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)
       ORDER BY name LIMIT $2`,
      [`%${search}%`, limit]
    );
    return NextResponse.json(rows);
  }

  const { rows } = await pool.query(
    `SELECT * FROM clients WHERE is_active=TRUE ORDER BY total_sessions DESC, name LIMIT $1`,
    [limit]
  );
  return NextResponse.json(rows);
});

export const POST = withAuth(async (req) => {
  const body = ClientCreateSchema.parse(await req.json());
  const { rows } = await pool.query(
    `INSERT INTO clients (name, phone, email, notes)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [body.name, body.phone || null, body.email || null, body.notes || null]
  );
  return NextResponse.json(rows[0], { status: 201 });
});
