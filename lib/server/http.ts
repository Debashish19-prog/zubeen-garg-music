import { NextResponse } from 'next/server';

/** JSON error response; errors carrying a `status` (TgError) keep it. */
export function fail(e: unknown) {
  const status = (e as { status?: number }).status;
  const msg = (e as Error)?.message || 'Something went wrong.';
  if (!status || status >= 500) console.error('[zubeen]', e);
  return NextResponse.json({ error: msg }, { status: status && status >= 400 && status < 600 ? status : 500 });
}
