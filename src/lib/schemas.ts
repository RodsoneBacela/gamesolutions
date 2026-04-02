import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const SessionCreateSchema = z.object({
  station_id:  z.number().int().positive(),
  client_name: z.string().min(1).max(150),
  client_id:   z.number().int().positive().optional().nullable(),
  mode:        z.enum(['Solo', 'Accompanied']),
  rate_id:     z.number().int().positive(),
});

export const SessionCloseSchema = z.object({
  notes: z.string().optional(),
});

export const SessionExtendSchema = z.object({
  extra_minutes: z.number().int().positive(),
  rate_id:       z.number().int().positive().optional(),
});

export const PaymentCreateSchema = z.object({
  session_id:   z.number().int().positive().optional().nullable(),
  client_name:  z.string().min(1).max(150),
  total_amount: z.coerce.number().positive(),
  paid_amount:  z.coerce.number().min(0),
  method:       z.enum(['Cash', 'M-Pesa', 'E-Mola', 'Transfer', 'Other']),
  description:  z.string().optional(),
});

export const ClientCreateSchema = z.object({
  name:   z.string().min(1).max(150),
  phone:  z.string().max(20).optional().nullable(),
  email:  z.string().email().optional().nullable().or(z.literal('')),
  notes:  z.string().optional().nullable(),
});

export const ClientUpdateSchema = ClientCreateSchema.partial();

export const EquipmentCreateSchema = z.object({
  name:            z.string().min(1).max(150),
  category:        z.string().optional(),
  serial_number:   z.string().optional(),
  status:          z.enum(['In Use', 'In Maintenance', 'Decommissioned']).optional(),
  location:        z.string().optional(),
  purchase_value:  z.coerce.number().optional().nullable(),
  warranty_expiry: z.string().optional().nullable(),
  notes:           z.string().optional(),
});

export const MaintenanceCreateSchema = z.object({
  equipment_id:   z.number().int().positive().optional().nullable(),
  equipment_name: z.string().min(1).max(150),
  description:    z.string().min(1),
  technician:     z.string().optional(),
  estimated_cost: z.coerce.number().optional().nullable(),
});

export const MaintenanceCloseSchema = z.object({
  actual_cost: z.coerce.number().optional().nullable(),
});

export const RateCreateSchema = z.object({
  name:         z.string().min(1).max(100),
  duration_min: z.number().int().positive(),
  amount:       z.coerce.number().positive(),
  mode:         z.enum(['Solo', 'Accompanied']),
});

export const FinancialCreateSchema = z.object({
  description: z.string().min(1),
  category:    z.string().optional(),
  type:        z.enum(['Income', 'Expense']),
  amount:      z.coerce.number().positive(),
  method:      z.string().optional(),
  date:        z.string().optional(),
  reference:   z.string().optional(),
});

export const TournamentCreateSchema = z.object({
  name:            z.string().min(1).max(150),
  tournament_date: z.string(),
  entry_fee:       z.coerce.number().min(0),
  prize:           z.coerce.number().min(0),
  max_players:     z.coerce.number().int().min(2).refine(n => n % 2 === 0, { message: 'Must be even' }),
  notes:           z.string().optional(),
});

export const UserCreateSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  email:    z.string().email().optional(),
  role:     z.enum(['admin', 'user']),
});
