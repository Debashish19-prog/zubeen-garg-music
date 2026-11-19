import type { Metadata } from 'next';
import { Suspense } from 'react';
import AlbumsView from '@/components/views/AlbumsView';
import { DB } from '@/lib/server/catalog';

export const metadata: Metadata = { title: 'Albums & Films' };

export default function AlbumsPage() {
  return (
    <Suspense fallback={null}>
      <AlbumsView langs={DB.langOrder} decades={DB.decOrder} />
    </Suspense>
  );
}
