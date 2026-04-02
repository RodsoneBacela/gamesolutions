import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (_req, { user }) => {
  return NextResponse.json({ id: Number(user.sub), username: user.username, role: user.role });
});
