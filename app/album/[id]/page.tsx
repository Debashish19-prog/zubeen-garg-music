import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListPage from '@/components/music/ListPage';
import { Card, Shelf } from '@/components/music/Cards';
import { Cover } from '@/components/ui/Cover';
import { DB, albumDTO, baseIds, listPayload, toAlbum } from '@/lib/server/catalog';
import { colorOfFast } from '@/lib/server/color';
import { KIND_LABEL, LABEL_KIND } from '@/lib/meta';

type P = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const a = albumDTO(Number((await params).id));
  return { title: a ? `${a.n}${a.y ? ` (${a.y})` : ''}` : 'Album not found' };
}

export default async function AlbumPage({ params }: P) {
  const { id } = await params;
  const a = albumDTO(Number(id));
  if (!a) notFound();
  const ids = baseIds('album', id)!;
  const color = await colorOfFast(a.img, a.n);
  const more = DB.albums
    .filter((x) => x.i !== a.id && x.l === a.l && x.img && x.y && a.y && Math.abs(x.y - a.y) <= 2)
    .sort((x, y) => y.ns - x.ns)
    .slice(0, 14)
    .map(toAlbum);
  return (
    <>
      <ListPage
        ctx={{ key: 'album:' + a.id, label: a.n, href: '/album/' + a.id, img: a.img, kind: 'Album' }}
        kind={KIND_LABEL[a.k] || 'Album'}
        artist={a.k === LABEL_KIND ? [...new Set(ids.map((i) => DB.songs[i].c).filter(Boolean))].join(', ') || undefined : undefined}
        title={a.n}
        cover={{ type: 'art', src: a.img, name: a.n }}
        color={color}
        list={listPayload(ids, 200)}
        showCover={false}
        showAlbum={false}
        meta={[a.y ? String(a.y) : '', a.l !== 'Unspecified' ? a.l : ''].filter(Boolean)}
        links={a.sa ? [{ label: 'Open on JioSaavn', href: `https://www.jiosaavn.com/embed/album/${a.sa}` }] : []}
      />
      {more.length > 0 && (
        <div className="pb-6">
          <Shelf title={`More from ${a.y ? `around ${a.y}` : 'Zubeen'}`} sub={a.l !== 'Unspecified' ? a.l : undefined}>
            {more.map((m) => (
              <Card key={m.id} href={`/album/${m.id}`} title={m.n} sub={[m.y, KIND_LABEL[m.k] || ''].filter(Boolean).join(' · ')} cover={<Cover src={m.img} name={m.n} />} play={{ ctx: { key: 'album:' + m.id, label: m.n, href: `/album/${m.id}`, img: m.img, kind: 'Album' }, type: 'album', key: String(m.id) }} />
            ))}
          </Shelf>
        </div>
      )}
    </>
  );
}
