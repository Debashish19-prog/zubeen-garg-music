import { NextResponse } from 'next/server';
import { authEnabled, isHttps, isOwner, login, logout, ownerConfigured } from '@/lib/server/owner';

export const dynamic = 'force-dynamic';

/** GET -> { owner, auth, configured } · POST { password } signs the owner in · DELETE signs out */
export async function GET() {
  return NextResponse.json({ owner: await isOwner(), auth: authEnabled(), configured: ownerConfigured() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const r = await login(String(password || ''), isHttps(req));
  return r.ok ? NextResponse.json({ owner: true }) : NextResponse.json({ error: r.error }, { status: r.status });
}

export async function DELETE() {
  await logout();
  return NextResponse.json({ owner: false });
}
