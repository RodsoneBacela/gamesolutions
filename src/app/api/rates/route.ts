import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { RateCreateSchema } from '@/lib/schemas';

export const GET = withAuth(async () => {
  const { rows } = await pool.query('SELECT * FROM rates WHERE is_active=TRUE ORDER BY mode, duration_min');
  return NextResponse.json(rows);
});

export const POST = withAuth(async (req) => {
  const body = RateCreateSchema.parse(await req.json());
  const { rows } = await pool.query(
    'INSERT INTO rates (name, duration_min, amount, mode) VALUES ($1,$2,$3,$4) RETURNING *',
    [body.name, body.duration_min, body.amount, body.mode]
  );
  return NextResponse.json(rows[0], { status: 201 });
}, { adminOnly: true });
