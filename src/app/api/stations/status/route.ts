import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async () => {
  const { rows } = await pool.query('SELECT * FROM v_station_status ORDER BY id');
  return NextResponse.json(rows);
});
