import { NextResponse } from 'next/server';
import { clearHistory, getLibrary } from '@/lib/server/library';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(getLibrary());
}

/** DELETE /api/library  ->  clears listening history and recently played (likes and playlists stay) */
export async function DELETE() {
  await clearHistory();
  return NextResponse.json(getLibrary());
}
