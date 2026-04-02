import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req) => {
  const url  = new URL(req.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [kpi, sessions] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE DATE(started_at)=$1) AS sessions_total,
        COUNT(*) FILTER (WHERE DATE(started_at)=$1 AND status='Active') AS sessions_active,
        COALESCE(SUM(total_amount) FILTER (WHERE DATE(started_at)=$1), 0) AS billed,
        COALESCE((SELECT SUM(paid_amount) FROM payments WHERE DATE(created_at)=$1), 0) AS collected
      FROM sessions WHERE DATE(started_at)=$1
    `, [date]),
    pool.query(`
      SELECT s.*, st.name AS station_name, st.console
      FROM sessions s JOIN stations st ON st.id=s.station_id
      WHERE DATE(s.started_at)=$1 ORDER BY s.started_at DESC
    `, [date]),
  ]);

  return NextResponse.json({ kpi: kpi.rows[0], sessions: sessions.rows });
});
