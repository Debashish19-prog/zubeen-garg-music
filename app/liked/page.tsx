import type { Metadata } from 'next';
import { LikedView } from '@/components/views/LibraryViews';

export const metadata: Metadata = { title: 'Liked Songs' };

export default function LikedPage() {
  return <LikedView />;
}
