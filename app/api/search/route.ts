import { NextResponse } from 'next/server';
import { search } from '@/lib/server/catalog';

export function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') || '').slice(0, 100);
  return NextResponse.json(search(q));
}
