import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { UserCreateSchema } from '@/lib/schemas';

export const GET = withAuth(async () => {
  const { rows } = await pool.query(
    'SELECT id, username, email, role, is_active, last_login, created_at FROM users ORDER BY id'
  );
  return NextResponse.json(rows);
}, { adminOnly: true });

export const POST = withAuth(async (req) => {
  const body = UserCreateSchema.parse(await req.json());
  const hash = await bcrypt.hash(body.password, 12);
  const { rows } = await pool.query(
    'INSERT INTO users (username, password_hash, email, role) VALUES ($1,$2,$3,$4) RETURNING id, username, email, role',
    [body.username, hash, body.email || null, body.role]
  );
  return NextResponse.json(rows[0], { status: 201 });
}, { adminOnly: true });
