import type { Metadata } from 'next';
import { PlaylistView } from '@/components/views/LibraryViews';

export const metadata: Metadata = { title: 'Playlist' };

export default async function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlaylistView id={id} />;
}
