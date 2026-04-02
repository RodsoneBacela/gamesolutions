import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export const ok   = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const err  = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
export const notFound = (msg = 'Not found') => NextResponse.json({ error: msg }, { status: 404 });

type RouteHandler = (req: Request, ctx: unknown) => Promise<NextResponse>;

export function apiHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof ZodError) {
        return err(e.issues.map((x: any) => x.message).join(', '), 422);
      }
      console.error('[API Error]', e);
      return err('Internal server error', 500);
    }
  };
}
