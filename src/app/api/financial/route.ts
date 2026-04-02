import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { FinancialCreateSchema } from '@/lib/schemas';

export const GET = withAuth(async (req) => {
  const url   = new URL(req.url);
  const type  = url.searchParams.get('type');
  const start = url.searchParams.get('start_date');
  const end   = url.searchParams.get('end_date');

  const conds: string[] = [];
  const vals:  unknown[] = [];
  let i = 1;
  if (type)  { conds.push(`type=$${i++}`);           vals.push(type); }
  if (start) { conds.push(`date>=$${i++}`);           vals.push(start); }
  if (end)   { conds.push(`date<=$${i++}`);           vals.push(end); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT * FROM financial ${where} ORDER BY created_at DESC LIMIT 500`,
    vals
  );
  return NextResponse.json(rows);
});

export const POST = withAuth(async (req) => {
  const body = FinancialCreateSchema.parse(await req.json());
  const { rows } = await pool.query(
    `INSERT INTO financial (description, category, type, amount, method, date, reference)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [body.description, body.category || null, body.type, body.amount,
     body.method || 'Cash', body.date || new Date().toISOString().split('T')[0], body.reference || null]
  );
  return NextResponse.json(rows[0], { status: 201 });
});
