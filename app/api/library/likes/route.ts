import { NextResponse } from 'next/server';
import { setLike } from '@/lib/server/library';

/** POST { id, on }  ->  likes[] */
export async function POST(req: Request) {
  try {
    const { id, on } = (await req.json()) as { id: number; on: boolean };
    return NextResponse.json(await setLike(Number(id), !!on));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
