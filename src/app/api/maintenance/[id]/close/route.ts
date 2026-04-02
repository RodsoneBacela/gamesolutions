import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { MaintenanceCloseSchema } from '@/lib/schemas';

export const PATCH = withAuth(async (req, { params: _params }) => {
  const params = await _params;
  const body = MaintenanceCloseSchema.parse(await req.json());
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE maintenance SET status='Closed', actual_cost=$1, closed_at=NOW()
       WHERE id=$2 RETURNING *`,
      [body.actual_cost || null, params.id]
    );
    const ticket = rows[0];
    if (!ticket) throw new Error('Not found');
    if (ticket.equipment_id) {
      await client.query(`UPDATE equipment SET status='In Use' WHERE id=$1`, [ticket.equipment_id]);
    }
    if (body.actual_cost) {
      await client.query(
        `INSERT INTO financial (description, category, type, amount, method, date)
         VALUES ($1,'Maintenance','Expense',$2,'Cash',CURRENT_DATE)`,
        [`Manutenção - ${ticket.equipment_name}`, body.actual_cost]
      );
    }
    return ticket;
  });
  return NextResponse.json(result);
});
