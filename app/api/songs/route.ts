import { NextResponse } from 'next/server';
import { songsDTO } from '@/lib/server/catalog';

/** GET /api/songs?ids=1,2,3  ->  Song[] (at most 500) */
export function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get('ids') || '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0)
    .slice(0, 500);
  return NextResponse.json(songsDTO(ids));
}
