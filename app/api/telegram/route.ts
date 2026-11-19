import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/server/owner';
import { cancelLogin, sendLoginCode, submitLoginCode, submitLoginPassword, tgSignOut, tgStatus } from '@/lib/server/telegram';
import { resyncFromTelegram } from '@/lib/server/uploads';
import { fail } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

/** Owner only. GET -> connection status · POST { action } runs one sign-in step · DELETE signs the server out of Telegram */
export async function GET(req: Request) {
  const denied = await requireOwner(req);
  if (denied) return denied;
  return NextResponse.json(await tgStatus(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const denied = await requireOwner(req);
  if (denied) return denied;
  try {
    const b = (await req.json().catch(() => ({}))) as { action?: string; phone?: string; code?: string; password?: string };
    switch (b.action) {
      case 'code': await sendLoginCode(String(b.phone || '')); break;
      case 'verify': await submitLoginCode(String(b.code || '')); break;
      case 'password': await submitLoginPassword(String(b.password || '')); break;
      case 'cancel': cancelLogin(); break;
      case 'resync': return NextResponse.json({ ...(await tgStatus()), resync: await resyncFromTelegram() });
      default: return NextResponse.json({ error: 'unknown action' }, { status: 400 });
    }
    return NextResponse.json(await tgStatus());
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request) {
  const denied = await requireOwner(req);
  if (denied) return denied;
  await tgSignOut();
  return NextResponse.json(await tgStatus());
}
