import type { Metadata } from 'next';
import { LibraryView } from '@/components/views/LibraryViews';

export const metadata: Metadata = { title: 'Your Library' };

export default function LibraryPage() {
  return <LibraryView />;
}
