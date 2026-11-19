import { uploadByKey } from '@/lib/server/uploadStore';
import { BLOCK, audioBlock } from '@/lib/server/telegram';
import { fail } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ key: string }> };
const AHEAD = 3; // blocks fetched ahead of what the browser has read

function parseRange(header: string | null, size: number): { start: number; end: number; partial: boolean } | null {
  if (!header) return { start: 0, end: size - 1, partial: false };
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (!m[1] && !m[2])) return null;
  let start: number, end: number;
  if (m[1]) {
    start = Number(m[1]);
    end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  } else {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  }
  return start < size && start <= end ? { start, end, partial: true } : null;
}

async function respond(req: Request, { params }: Ctx, head: boolean) {
  const rec = uploadByKey((await params).key);
  if (!rec) return new Response('Not found', { status: 404 });
  const size = rec.size;
  const r = parseRange(req.headers.get('range'), size);
  if (!r) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });

  const headers = new Headers({
    'Content-Type': rec.mime || 'audio/mpeg',
    'Content-Length': String(r.end - r.start + 1),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=604800',
    ETag: `"${rec.key}"`,
  });
  if (r.partial) headers.set('Content-Range', `bytes ${r.start}-${r.end}/${size}`);
  const status = r.partial ? 206 : 200;
  if (head) return new Response(null, { status, headers });

  const first = Math.floor(r.start / BLOCK);
  const last = Math.floor(r.end / BLOCK);
  // fetch the first block before answering, so a Telegram problem becomes a proper error status
  let firstBuf: Buffer;
  try {
    firstBuf = await audioBlock(rec.msgId, first);
  } catch (e) {
    return fail(e);
  }

  const ahead = new Map<number, Promise<Buffer>>();
  const get = (i: number) => {
    let p = ahead.get(i);
    if (!p) {
      p = audioBlock(rec.msgId, i);
      p.catch(() => undefined);
      ahead.set(i, p);
    }
    return p;
  };
  let next = first;
  const body = new ReadableStream<Uint8Array>(
    {
      async pull(ctl) {
        if (next > last) return ctl.close();
        for (let k = next + 1; k <= Math.min(last, next + AHEAD); k++) get(k);
        const buf = next === first ? firstBuf : await get(next);
        ahead.delete(next);
        const from = next === first ? r.start - first * BLOCK : 0;
        const to = next === last ? r.end - last * BLOCK + 1 : buf.length;
        if (to > from) ctl.enqueue(buf.subarray(from, Math.min(to, buf.length)));
        next++;
        if (next > last) ctl.close();
      },
      cancel() {
        next = last + 1;
        ahead.clear();
      },
    },
    { highWaterMark: 0 },
  );
  return new Response(body, { status, headers });
}

/** GET -> the uploaded audio, streamed from Telegram, with Range support so the player can seek. */
export const GET = (req: Request, ctx: Ctx) => respond(req, ctx, false);
export const HEAD = (req: Request, ctx: Ctx) => respond(req, ctx, true);
