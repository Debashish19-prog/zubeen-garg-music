import { coverBytes } from '@/lib/server/uploads';
import { fail } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

/** GET -> the cover art of an uploaded song (kept in Telegram, cached in data/covers) */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const b = await coverBytes((await params).key);
    return new Response(new Uint8Array(b), { headers: { 'Content-Type': 'image/jpeg', 'Content-Length': String(b.length), 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch (e) {
    return fail(e);
  }
}
