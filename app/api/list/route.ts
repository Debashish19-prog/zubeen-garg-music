import { NextResponse } from 'next/server';
import { baseIds, filterIds, listPayload } from '@/lib/server/catalog';
import type { ListFilters, ListType } from '@/lib/types';

const TYPES: ListType[] = ['all', 'lang', 'decade', 'col', 'album', 'person', 'ids', 'uploads'];

export const dynamic = 'force-dynamic';

/** GET /api/list?type=lang&key=Assamese&sort=year&play=any&kind=&lang=&dec=&q=  ->  ListPayload */
export function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const type = (p.get('type') || 'all') as ListType;
  if (!TYPES.includes(type)) return NextResponse.json({ error: 'bad type' }, { status: 400 });
  const base = baseIds(type, p.get('key') || '');
  if (!base) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const f: ListFilters = {
    sort: (p.get('sort') as ListFilters['sort']) || 'none',
    play: (p.get('play') as ListFilters['play']) || '',
    kind: p.get('kind') || '',
    lang: p.get('lang') || '',
    dec: p.get('dec') || '',
    q: (p.get('q') || '').slice(0, 100),
  };
  return NextResponse.json(listPayload(filterIds(base, f), Math.min(200, Number(p.get('first')) || 100)));
}
