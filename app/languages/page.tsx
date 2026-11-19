import type { Metadata } from 'next';
import { BrowseTile } from '@/components/music/Cards';
import { DB } from '@/lib/server/catalog';
import { NATIVE, TILE_COLORS } from '@/lib/meta';
import { fmt } from '@/lib/text';
import { TileGrid } from '@/components/views/TileGrid';

export const metadata: Metadata = { title: 'Languages' };

export default function LanguagesPage() {
  return (
    <TileGrid title="Languages" sub="He sang in more than forty languages and dialects over his career. These are the ones in this catalogue." color="#148a08">
      {DB.langOrder.map((l, k) => (
        <BrowseTile key={l} href={`/language/${encodeURIComponent(l)}`} title={l} sub={`${fmt(DB.langs[l].length)} songs`} color={TILE_COLORS[k % TILE_COLORS.length]} glyph={NATIVE[l] && NATIVE[l] !== l ? NATIVE[l] : undefined} />
      ))}
    </TileGrid>
  );
}
