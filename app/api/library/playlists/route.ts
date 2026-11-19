import { NextResponse } from 'next/server';
import { createPlaylist } from '@/lib/server/library';

/** POST { name?, songs? }  ->  Playlist */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { name?: string; songs?: number[] };
  return NextResponse.json(await createPlaylist(typeof body.name === 'string' ? body.name : undefined, Array.isArray(body.songs) ? body.songs.map(Number) : []));
}
