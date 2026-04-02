import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { EquipmentCreateSchema } from '@/lib/schemas';

export const GET = withAuth(async () => {
  const { rows } = await pool.query('SELECT * FROM equipment ORDER BY name');
  return NextResponse.json(rows);
});

export const POST = withAuth(async (req) => {
  const body = EquipmentCreateSchema.parse(await req.json());
  const { rows } = await pool.query(
    `INSERT INTO equipment (name, category, serial_number, status, location, purchase_value, warranty_expiry, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [body.name, body.category||null, body.serial_number||null, body.status||'In Use',
     body.location||null, body.purchase_value||null, body.warranty_expiry||null, body.notes||null]
  );
  return NextResponse.json(rows[0], { status: 201 });
}, { adminOnly: true });
