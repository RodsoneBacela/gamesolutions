import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { withTransaction } from '@/lib/db';

export const PUT = withAuth(async (req, { params: _params }) => {
  const params = await _params;
  const { status, technician, estimated_cost } = await req.json();
  const sets: string[] = [], vals: unknown[] = [];
  let i = 1;
  if (status)         { sets.push(`status=$${i++}`);         vals.push(status); }
  if (technician)     { sets.push(`technician=$${i++}`);     vals.push(technician); }
  if (estimated_cost) { sets.push(`estimated_cost=$${i++}`); vals.push(estimated_cost); }
  vals.push(params.id);
  const { rows } = await pool.query(
    `UPDATE maintenance SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, vals
  );
  return NextResponse.json(rows[0]);
});
