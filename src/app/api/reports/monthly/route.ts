import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req) => {
  const url   = new URL(req.url);
  const start = url.searchParams.get('start') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const end   = url.searchParams.get('end')   || new Date().toISOString().split('T')[0];

  const { rows } = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
      SUM(CASE WHEN type='Income'  THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type='Expense' THEN amount ELSE 0 END) AS expense,
      SUM(CASE WHEN type='Income'  THEN amount ELSE -amount END) AS net,
      COUNT(*) AS transactions
    FROM financial
    WHERE date BETWEEN $1 AND $2
    GROUP BY DATE_TRUNC('month', date)
    ORDER BY month
  `, [start, end]);

  const methods = await pool.query(`
    SELECT method, SUM(paid_amount) AS total, COUNT(*) AS count
    FROM payments WHERE DATE(created_at) BETWEEN $1 AND $2
    GROUP BY method ORDER BY total DESC
  `, [start, end]);

  return NextResponse.json({ monthly: rows, methods: methods.rows });
});
