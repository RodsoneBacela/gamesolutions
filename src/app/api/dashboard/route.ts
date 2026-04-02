import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async () => {
  const [kpi, stations, sessions] = await Promise.all([
    pool.query('SELECT * FROM v_dashboard'),
    pool.query('SELECT * FROM v_station_status ORDER BY id'),
    pool.query(`
      SELECT s.id, s.client_name, s.mode, s.status, s.payment_status,
             s.started_at, s.expected_end_at, s.total_amount,
             st.name AS station_name
      FROM sessions s JOIN stations st ON st.id = s.station_id
      WHERE DATE(s.started_at) = CURRENT_DATE
      ORDER BY s.started_at DESC LIMIT 20
    `),
  ]);
  return NextResponse.json({ kpi: kpi.rows[0], stations: stations.rows, sessions: sessions.rows });
});
