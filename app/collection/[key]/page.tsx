import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListPage from '@/components/music/ListPage';
import { collectionIds, listPayload } from '@/lib/server/catalog';
import { collectionMeta } from '@/lib/meta';

type P = { params: Promise<{ key: string }> };
// mixes reshuffle daily
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = collectionMeta((await params).key);
  return { title: c?.name ?? 'Collection not found' };
}

export default async function CollectionPage({ params }: P) {
  const { key } = await params;
  const c = collectionMeta(key);
  const ids = c ? collectionIds(key) : null;
  if (!c || !ids) notFound();
  return (
    <ListPage
      ctx={{ key: 'col:' + key, label: c.name, href: '/collection/' + key, img: c.photo, kind: c.mix ? 'Mix' : 'Collection' }}
      kind={c.mix ? 'Mix' : 'Collection'}
      title={c.name}
      desc={c.blurb}
      cover={{ type: 'photo', src: c.photo, name: c.name, color: c.color, mix: c.mix }}
      color={c.color}
      list={listPayload(ids, 120)}
      source={{ type: 'col', key }}
      defaultSort="none"
    />
  );
}
