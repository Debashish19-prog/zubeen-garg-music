import { NextResponse } from 'next/server';
import { queryAlbums, toAlbum } from '@/lib/server/catalog';

/** GET /api/albums?lang=&dec=&kind=&sort=songs|old|new|az&q=&offset=0&limit=60 */
export function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const list = queryAlbums({ lang: p.get('lang') || '', dec: p.get('dec') || '', kind: p.get('kind') || '', sort: p.get('sort') || 'songs', q: (p.get('q') || '').slice(0, 100) });
  const offset = Math.max(0, Number(p.get('offset')) || 0);
  const limit = Math.min(200, Math.max(1, Number(p.get('limit')) || 60));
  return NextResponse.json({ total: list.length, albums: list.slice(offset, offset + limit).map(toAlbum) });
}
