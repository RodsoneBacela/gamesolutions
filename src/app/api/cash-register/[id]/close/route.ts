import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';

// PATCH /api/cash-register/[id]/close
export const PATCH = withAuth(async (req, { params: _params }) => {
  const params = await _params;
  // Calcula o total cobrado durante a caixa
  const { rows: cr } = await pool.query(
    'SELECT * FROM cash_registers WHERE id=$1 AND status=$2',
    [params.id, 'Open']
  );
  if (!cr[0]) {
    return NextResponse.json({ error: 'Caixa não encontrada ou já fechada' }, { status: 404 });
  }

  const { rows: collected } = await pool.query(`
    SELECT COALESCE(SUM(paid_amount), 0) AS total
    FROM payments
    WHERE created_at >= $1
      AND ($2::timestamptz IS NULL OR created_at <= $2)
  `, [cr[0].opened_at, null]);

  const collectedAmount = Number(collected[0].total);

  const { rows } = await pool.query(`
    UPDATE cash_registers
    SET status='Closed', closed_at=NOW(), collected_amount=$1
    WHERE id=$2
    RETURNING *
  `, [collectedAmount, params.id]);

  return NextResponse.json(rows[0]);
});
