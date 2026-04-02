import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { z } from 'zod';

const OpenSchema = z.object({
  target_amount: z.coerce.number().min(0),
  notes:         z.string().optional().nullable(),
});

// GET — caixa activa ou histórico
export const GET = withAuth(async (req) => {
  const url  = new URL(req.url);
  const mode = url.searchParams.get('mode'); // 'active' | 'history'

  if (mode === 'active') {
    // Busca caixa aberta hoje e calcula o valor cobrado em tempo real
    const { rows } = await pool.query(`
      SELECT
        cr.*,
        u.username AS opened_by_name,
        COALESCE((
          SELECT SUM(p.paid_amount)
          FROM payments p
          WHERE DATE(p.created_at) = DATE(cr.opened_at)
            AND p.created_at >= cr.opened_at
            AND (cr.closed_at IS NULL OR p.created_at <= cr.closed_at)
        ), 0) AS collected_amount,
        (
          SELECT COUNT(*)
          FROM sessions s
          WHERE DATE(s.started_at) = DATE(cr.opened_at)
            AND s.started_at >= cr.opened_at
        ) AS sessions_count
      FROM cash_registers cr
      JOIN users u ON u.id = cr.opened_by
      WHERE cr.status = 'Open'
      ORDER BY cr.opened_at DESC
      LIMIT 1
    `);
    return NextResponse.json(rows[0] || null);
  }

  // History — últimas 30 caixas
  const { rows } = await pool.query(`
    SELECT cr.*, u.username AS opened_by_name
    FROM cash_registers cr
    JOIN users u ON u.id = cr.opened_by
    ORDER BY cr.opened_at DESC
    LIMIT 30
  `);
  return NextResponse.json(rows);
});

// POST — abrir caixa
export const POST = withAuth(async (req, { user }) => {
  // Verifica se já existe caixa aberta
  const { rows: existing } = await pool.query(
    "SELECT id FROM cash_registers WHERE status='Open' LIMIT 1"
  );
  if (existing.length) {
    return NextResponse.json({ error: 'Já existe uma caixa aberta' }, { status: 409 });
  }

  const body = OpenSchema.parse(await req.json());
  const { rows } = await pool.query(
    `INSERT INTO cash_registers (opened_by, target_amount, notes)
     VALUES ($1, $2, $3) RETURNING *`,
    [Number(user.sub), body.target_amount, body.notes || null]
  );
  return NextResponse.json(rows[0], { status: 201 });
});
