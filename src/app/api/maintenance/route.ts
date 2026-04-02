import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { MaintenanceCreateSchema } from '@/lib/schemas';
import { withTransaction } from '@/lib/db';

export const GET = withAuth(async (req) => {
  const url    = new URL(req.url);
  const status = url.searchParams.get('status');
  const where  = status ? `WHERE m.status=$1` : '';
  const vals   = status ? [status] : [];
  const { rows } = await pool.query(
    `SELECT m.*, e.name AS equip_name FROM maintenance m
     LEFT JOIN equipment e ON e.id=m.equipment_id
     ${where} ORDER BY m.created_at DESC`,
    vals
  );
  return NextResponse.json(rows);
});

export const POST = withAuth(async (req) => {
  const body = MaintenanceCreateSchema.parse(await req.json());
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO maintenance (equipment_id, equipment_name, description, technician, estimated_cost)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [body.equipment_id||null, body.equipment_name, body.description, body.technician||null, body.estimated_cost||null]
    );
    if (body.equipment_id) {
      await client.query(
        `UPDATE equipment SET status='In Maintenance' WHERE id=$1`,
        [body.equipment_id]
      );
    }
    return rows[0];
  });
  return NextResponse.json(result, { status: 201 });
});
