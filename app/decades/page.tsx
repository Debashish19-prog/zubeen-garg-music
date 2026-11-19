import type { Metadata } from 'next';
import { BrowseTile } from '@/components/music/Cards';
import { DB } from '@/lib/server/catalog';
import { TILE_COLORS } from '@/lib/meta';
import { fmt } from '@/lib/text';
import { TileGrid } from '@/components/views/TileGrid';

export const metadata: Metadata = { title: 'Decades' };

export default function DecadesPage() {
  return (
    <TileGrid title="Decades" sub="From his first cassette, Anamika, in 1992 to the songs still being released." color="#bc5900">
      {DB.decOrder.map((d, k) => (
        <BrowseTile key={d} href={`/decade/${d}`} title={`The ${String(d).slice(2)}s`} sub={`${fmt(DB.decs[d].length)} songs`} color={TILE_COLORS[(k * 5 + 3) % TILE_COLORS.length]} glyph={`’${String(d).slice(2)}`} />
      ))}
    </TileGrid>
  );
}
