import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { PaymentCreateSchema } from '@/lib/schemas';
import { withTransaction } from '@/lib/db';

export const GET = withAuth(async (req) => {
  const url  = new URL(req.url);
  const type = url.searchParams.get('type');
  const start = url.searchParams.get('start_date');
  const end   = url.searchParams.get('end_date');

  const conds: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (start) { conds.push(`DATE(p.created_at)>=$${i++}`); vals.push(start); }
  if (end)   { conds.push(`DATE(p.created_at)<=$${i++}`); vals.push(end); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT p.*, s.status AS session_status FROM payments p
     LEFT JOIN sessions s ON s.id=p.session_id
     ${where} ORDER BY p.created_at DESC LIMIT 200`,
    vals
  );
  return NextResponse.json(rows);
});

export const POST = withAuth(async (req) => {
  const body = PaymentCreateSchema.parse(await req.json());
  const balance = body.total_amount - body.paid_amount;

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO payments (session_id, client_name, total_amount, paid_amount, balance, method, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [body.session_id || null, body.client_name, body.total_amount, body.paid_amount, balance, body.method, body.description || null]
    );
    const payment = rows[0];

    // Auto-insert into financial
    await client.query(
      `INSERT INTO financial (description, category, type, amount, method, date)
       VALUES ($1,'Gaming Session','Income',$2,$3,CURRENT_DATE)`,
      [`Pagamento - ${body.client_name}`, body.paid_amount, body.method]
    );

    // Update session payment status
    if (body.session_id) {
      const status = balance <= 0 ? 'Paid' : 'Partial';
      await client.query(
        'UPDATE sessions SET payment_status=$1 WHERE id=$2',
        [status, body.session_id]
      );
    }
    return payment;
  });

  return NextResponse.json(result, { status: 201 });
});
