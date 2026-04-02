import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production');
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export interface JWTPayload {
  sub: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

type Handler = (req: NextRequest, ctx: { params: Record<string, string>; user: JWTPayload }) => Promise<NextResponse>;

export function withAuth(handler: Handler, options?: { adminOnly?: boolean }) {
  return async (req: NextRequest, ctx: { params: Record<string, string> }) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    if (options?.adminOnly && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return handler(req, { ...ctx, user });
  };
}
