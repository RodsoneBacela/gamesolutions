import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { RateCreateSchema } from '@/lib/schemas';

export const PUT = withAuth(async (req, { params: _params }) => {
  const params = await _params;
  const body = RateCreateSchema.parse(await req.json());
  const { rows } = await pool.query(
    'UPDATE rates SET name=$1, duration_min=$2, amount=$3, mode=$4 WHERE id=$5 RETURNING *',
    [body.name, body.duration_min, body.amount, body.mode, params.id]
  );
  return NextResponse.json(rows[0]);
}, { adminOnly: true });

export const DELETE = withAuth(async (_req, { params: _params }) => {
  const params = await _params;
  await pool.query('UPDATE rates SET is_active=FALSE WHERE id=$1', [params.id]);
  return NextResponse.json({ ok: true });
}, { adminOnly: true });
