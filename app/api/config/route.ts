import { NextResponse } from 'next/server';
import { resolverEnabled } from '@/lib/server/resolve';

export function GET() {
  return NextResponse.json({ resolver: resolverEnabled() });
}
