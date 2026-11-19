import { NextResponse } from 'next/server';
import { deletePlaylist, patchPlaylist, type PlaylistPatch } from '@/lib/server/library';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const body = (await req.json()) as PlaylistPatch;
    return NextResponse.json(await patchPlaylist(id, body));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: (e as Error).message === 'not found' ? 404 : 400 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await deletePlaylist(id);
  return NextResponse.json({ ok: true });
}
