import { NextResponse } from 'next/server';
import { colorOf, isAllowedArt } from '@/lib/server/color';

/** GET /api/color?src=<artwork url>  ->  { color: "#rrggbb" } */
export async function GET(req: Request) {
  const src = new URL(req.url).searchParams.get('src') || '';
  if (!isAllowedArt(src)) return NextResponse.json({ error: 'artwork host not allowed' }, { status: 400 });
  const color = await colorOf(src);
  return NextResponse.json({ color }, { headers: { 'Cache-Control': 'public, max-age=86400' } });
}
