import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const PATCH = withAuth(async (req, { params: _params }) => {
  const params = await _params;
  const body = await req.json();
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (body.role !== undefined)      { sets.push(`role=$${i++}`);      vals.push(body.role); }
  if (body.is_active !== undefined) { sets.push(`is_active=$${i++}`); vals.push(body.is_active); }
  if (body.password)                { sets.push(`password_hash=$${i++}`); vals.push(await bcrypt.hash(body.password, 12)); }
  if (!sets.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  vals.push(params.id);
  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(',')} WHERE id=$${i} RETURNING id, username, role, is_active`,
    vals
  );
  return NextResponse.json(rows[0]);
}, { adminOnly: true });

export const DELETE = withAuth(async (_req, { params: _params }) => {
  const params = await _params;
  await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [params.id]);
  return NextResponse.json({ ok: true });
}, { adminOnly: true });
