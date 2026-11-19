import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListPage from '@/components/music/ListPage';
import { DB, filterIds, listPayload } from '@/lib/server/catalog';
import { NATIVE, TILE_COLORS } from '@/lib/meta';
import { hash, hslToHex } from '@/lib/text';

type P = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  return { title: `${decodeURIComponent((await params).name)} songs` };
}

export default async function LanguagePage({ params }: P) {
  const name = decodeURIComponent((await params).name);
  const base = DB.langs[name];
  if (!base) notFound();
  const ids = filterIds(base, { sort: 'year' });
  const idx = DB.langOrder.indexOf(name);
  const color = idx >= 0 ? TILE_COLORS[idx % TILE_COLORS.length] : hslToHex(hash(name) % 360, 0.5, 0.35);
  const native = NATIVE[name] && NATIVE[name] !== name && name !== 'Unspecified' ? NATIVE[name] : '';
  return (
    <ListPage
      ctx={{ key: 'lang:' + name, label: `${name} songs`, href: '/language/' + encodeURIComponent(name), kind: 'Language' }}
      kind="Language"
      title={name}
      desc={name === 'Unspecified' ? 'Songs whose language the source did not record.' : `Songs he sang in ${name}${native ? ` (${native})` : ''}.`}
      cover={{ type: 'glyph', text: native || name.slice(0, 3), name }}
      color={color}
      list={listPayload(ids, 100)}
      source={{ type: 'lang', key: name }}
      defaultSort="year"
      filters={{ dec: true, kind: true, options: { langs: [], decades: DB.decOrder, kinds: [...new Set(base.map((i) => DB.songs[i].k))].sort() } }}
    />
  );
}
