import type { Metadata } from 'next';
import ListPage from '@/components/music/ListPage';
import { DB, filterIds, listPayload } from '@/lib/server/catalog';
import { photo } from '@/lib/meta';

export const metadata: Metadata = { title: 'All songs' };

export default function SongsPage() {
  const ids = filterIds(DB.songs.map((s) => s.i), { sort: 'year' });
  return (
    <ListPage
      ctx={{ key: 'all', label: 'All songs', href: '/songs', kind: 'Catalogue' }}
      kind="Catalogue"
      title="All Songs"
      desc="Every song in the catalogue: Wikipedia's list first, plus songs found only on JioSaavn, Apple Music, MusicBrainz or his labels' YouTube channels."
      cover={{ type: 'photo', src: photo('stage-sky'), name: 'All Songs', color: '#1e3264' }}
      color="#1e3264"
      list={listPayload(ids, 100)}
      source={{ type: 'all', key: '' }}
      defaultSort="year"
      filters={{ lang: true, dec: true, kind: true, options: { langs: DB.langOrder, decades: DB.decOrder, kinds: [...new Set(DB.songs.map((s) => s.k))].sort() } }}
    />
  );
}
