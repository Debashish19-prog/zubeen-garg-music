import { NextResponse } from 'next/server';
import { recordPlay } from '@/lib/server/library';
import type { RecentContext } from '@/lib/types';

/** POST { id, ctx? }  — records a play (and the list it was played from) */
export async function POST(req: Request) {
  try {
    const { id, ctx } = (await req.json()) as { id: number; ctx?: Partial<RecentContext> };
    await recordPlay(Number(id), ctx);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
