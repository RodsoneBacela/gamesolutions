import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { EquipmentCreateSchema } from '@/lib/schemas';

export const PUT = withAuth(async (req, { params: _params }) => {
  const params = await _params;
  const body = EquipmentCreateSchema.partial().parse(await req.json());
  const sets: string[] = [], vals: unknown[] = [];
  let i = 1;
  const fields: Record<string, unknown> = body as Record<string, unknown>;
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) { sets.push(`${k}=$${i++}`); vals.push(v); }
  }
  if (!sets.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  vals.push(params.id);
  const { rows } = await pool.query(
    `UPDATE equipment SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, vals
  );
  return NextResponse.json(rows[0]);
}, { adminOnly: true });
