import { NextResponse } from 'next/server';
import { isOwner, requireOwner } from '@/lib/server/owner';
import { createUpload, ownerUploads, parseMeta, publicUploads } from '@/lib/server/uploads';
import { fail } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET -> uploaded songs (public) · GET ?mine=1 -> the owner's upload records */
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get('mine') && (await isOwner())) return NextResponse.json(ownerUploads(), { headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json(publicUploads(), { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Owner only. Body: optional JPEG cover (X-Upload-Meta says how many bytes) followed by the audio
 * file. The bytes are passed straight on to Telegram as they arrive.
 */
export async function POST(req: Request) {
  const denied = await requireOwner(req);
  if (denied) return denied;
  try {
    const meta = parseMeta(req.headers.get('x-upload-meta'));
    if (!req.body) return NextResponse.json({ error: 'No file received.' }, { status: 400 });
    return NextResponse.json(await createUpload(req.body, meta));
  } catch (e) {
    return fail(e);
  }
}
