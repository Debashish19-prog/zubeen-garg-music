import { NextResponse } from 'next/server';
import { resolveYouTube, resolverEnabled } from '@/lib/server/resolve';

/** GET /api/resolve?id=123  ->  { yt: "videoId" | "" }  (needs YOUTUBE_API_KEY) */
export async function GET(req: Request) {
  if (!resolverEnabled()) return NextResponse.json({ yt: '', enabled: false });
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  try {
    return NextResponse.json({ yt: await resolveYouTube(id), enabled: true });
  } catch (e) {
    return NextResponse.json({ yt: '', enabled: true, error: String((e as Error).message) }, { status: 502 });
  }
}
