import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListPage from '@/components/music/ListPage';
import { DB, filterIds, listPayload } from '@/lib/server/catalog';
import { TILE_COLORS } from '@/lib/meta';

type P = { params: Promise<{ d: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  return { title: `The ${(await params).d}s` };
}

export default async function DecadePage({ params }: P) {
  const { d } = await params;
  const base = DB.decs[d];
  if (!base || d === '0') notFound();
  const ids = filterIds(base, { sort: 'year' });
  const k = DB.decOrder.indexOf(Number(d));
  return (
    <ListPage
      ctx={{ key: 'decade:' + d, label: `The ${d}s`, href: '/decade/' + d, kind: 'Decade' }}
      kind="Decade"
      title={`The ${d}s`}
      desc={`Songs released between ${d} and ${Number(d) + 9}.`}
      cover={{ type: 'glyph', text: `’${d.slice(2)}`, name: 'decade' + d }}
      color={TILE_COLORS[(k * 5 + 3) % TILE_COLORS.length]}
      list={listPayload(ids, 100)}
      source={{ type: 'decade', key: d }}
      defaultSort="year"
      filters={{ lang: true, kind: true, options: { langs: DB.langOrder, decades: [], kinds: [...new Set(base.map((i) => DB.songs[i].k))].sort() } }}
    />
  );
}
