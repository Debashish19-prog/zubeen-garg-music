import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/server/owner';
import { removeUpload, updateUpload, type UploadPatch } from '@/lib/server/uploads';
import { fail } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ key: string }> };

/** Owner only. PATCH { t, an, l, y, c, m, w } edits an uploaded song's details · DELETE removes it (and its Telegram messages) */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireOwner(req);
  if (denied) return denied;
  try {
    const patch = (await req.json()) as UploadPatch;
    return NextResponse.json({ song: await updateUpload((await params).key, patch) });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await requireOwner(req);
  if (denied) return denied;
  try {
    await removeUpload((await params).key);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
