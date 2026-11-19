'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { SearchPayload } from '@/lib/types';
import { COLLECTIONS, MIXES, NATIVE, TILE_COLORS, photo, albumHref } from '@/lib/meta';
import { fmt } from '@/lib/text';
import { prime } from '@/lib/client/songCache';
import { playContext } from '@/lib/client/menus';
import { useContextState } from '@/lib/client/hooks';
import { useShellData } from '@/components/shell/ShellData';
import { BrowseTile, Card, Shelf, staggerVariants } from '@/components/music/Cards';
import TrackList from '@/components/music/TrackList';
import { Cover, PersonAvatar } from '@/components/ui/Cover';
import { PlayButton } from '@/components/ui/PlayButton';
import { IconClose, IconSearch } from '@/components/ui/Icons';
import { KIND_LABEL, artistOf } from '@/lib/meta';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
type Tab = 'all' | 'songs' | 'albums' | 'people';

function Browse() {
  const nav = useShellData();
  const tiles = [
    ...COLLECTIONS.map((c, k) => ({ href: `/collection/${c.key}`, title: c.name, color: TILE_COLORS[(k * 3) % TILE_COLORS.length], img: c.photo })),
    ...MIXES.map((m, k) => ({ href: `/collection/${m.key}`, title: m.name, color: TILE_COLORS[(k * 3 + 7) % TILE_COLORS.length], img: m.photo })),
    { href: '/songs', title: 'All Songs', color: '#1e3264', img: photo('stage-sky') },
    { href: '/albums', title: 'Albums & Films', color: '#8d67ab', img: photo('stage-hat') },
    { href: '/people', title: 'Co-singers & Composers', color: '#477d95', img: photo('stage-band') },
    { href: '/credits', title: 'Written & Composed by Him', color: '#ba5d07', img: photo('guitar-night') },
  ];
  return (
    <>
      <h2 className="px-4 pt-6 pb-3 text-[22px] font-bold tracking-tight md:px-6 md:text-2xl">Browse all</h2>
      <motion.div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 md:px-6 lg:grid-cols-4 xl:grid-cols-5" initial="hidden" animate="show" variants={staggerVariants}>
        {tiles.map((t) => (
          <BrowseTile key={t.href} {...t} />
        ))}
      </motion.div>
      <h2 className="px-4 pt-8 pb-3 text-[22px] font-bold tracking-tight md:px-6 md:text-2xl">Languages</h2>
      <motion.div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 md:px-6 lg:grid-cols-4 xl:grid-cols-5" initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerVariants}>
        {nav.langs
          .filter((l) => l.name !== 'Unspecified')
          .map((l, k) => (
            <BrowseTile key={l.name} href={`/language/${encodeURIComponent(l.name)}`} title={l.name} sub={`${fmt(l.count)} songs`} color={TILE_COLORS[k % TILE_COLORS.length]} glyph={NATIVE[l.name] && NATIVE[l.name] !== l.name ? NATIVE[l.name] : undefined} />
          ))}
      </motion.div>
      <h2 className="px-4 pt-8 pb-3 text-[22px] font-bold tracking-tight md:px-6 md:text-2xl">Decades</h2>
      <motion.div className="grid grid-cols-2 gap-3 px-4 pb-8 sm:grid-cols-4 md:px-6" initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerVariants}>
        {nav.decades.map((d, k) => (
          <BrowseTile key={d.d} href={`/decade/${d.d}`} title={`The ${String(d.d).slice(2)}s`} sub={`${fmt(d.count)} songs`} color={TILE_COLORS[(k * 5 + 3) % TILE_COLORS.length]} glyph={`’${String(d.d).slice(2)}`} />
        ))}
      </motion.div>
    </>
  );
}

function TopResult({ r }: { r: NonNullable<SearchPayload['top']> }) {
  let href = '', title = '', kind = '', cover: React.ReactNode, sub = '';
  let play: { ids: number[]; ctx: { key: string; label: string; href: string; kind: string; img?: string } } | null = null;
  if (r.kind === 'song') {
    const s = r.song;
    href = albumHref(s); title = s.t; kind = 'Song'; sub = artistOf(s);
    cover = <Cover src={s.img} name={s.an} />;
    play = { ids: [s.id], ctx: { key: 'song:' + s.id, label: s.t, href, kind: 'Song', img: s.img } };
  } else if (r.kind === 'album') {
    const a = r.album;
    href = `/album/${a.id}`; title = a.n; kind = KIND_LABEL[a.k] || 'Album'; sub = `${a.y || ''} · ${fmt(a.ns)} songs`;
    cover = <Cover src={a.img} name={a.n} />;
  } else {
    const p = r.person;
    href = `/person/${encodeURIComponent(p.n)}`; title = p.n; kind = 'Artist'; sub = `${fmt(p.count)} songs with Zubeen`;
    cover = <PersonAvatar name={p.n} className="w-full text-[22px]" />;
  }
  const key = play?.ctx.key ?? (r.kind === 'album' ? 'album:' + r.album.id : 'person:' + (r.kind === 'person' ? r.person.n : ''));
  const { playing } = useContextState(key);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="group relative">
      <Link href={href} className="block h-full rounded-lg bg-[#181818] p-5 transition-colors duration-300 hover:bg-[#282828]">
        <div className={cx('w-[92px] shadow-[0_8px_24px_rgba(0,0,0,.5)]', r.kind === 'person' ? 'rounded-full' : 'rounded-md')}>{cover}</div>
        <div className="mt-5 line-clamp-2 text-[28px] leading-tight font-black tracking-tight md:text-[32px]">{title}</div>
        <div className="mt-2 flex items-center gap-2 text-[14px] text-sub">
          <span className="truncate">{sub}</span>
          <span className="rounded-full bg-black/50 px-3 py-1 text-[13px] font-bold text-white">{kind}</span>
        </div>
      </Link>
      {play && (
        <div className={cx('absolute right-5 bottom-5 transition-all duration-300', playing ? 'opacity-100' : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100')}>
          <PlayButton size={48} playing={playing} onClick={() => playContext(play!.ids, play!.ctx)} />
        </div>
      )}
    </motion.div>
  );
}

function Results({ q }: { q: string }) {
  const [data, setData] = useState<SearchPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  useEffect(() => {
    let live = true;
    setLoading(true);
    const ctl = new AbortController();
    fetch('/api/search?q=' + encodeURIComponent(q), { signal: ctl.signal })
      .then((r) => r.json())
      .then((d: SearchPayload) => {
        if (!live) return;
        prime(d.songs);
        setData(d);
      })
      .catch(() => undefined)
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
      ctl.abort();
    };
  }, [q]);

  if (!data) return <div className="space-y-3 px-4 pt-6 md:px-6">{Array.from({ length: 6 }, (_, k) => <div key={k} className="h-14 rounded-md shimmer" />)}</div>;
  const ctx = { key: 'search:' + q, label: `Search: “${q}”`, href: `/search?q=${encodeURIComponent(q)}`, kind: 'Search' };
  const nothing = !data.songIds.length && !data.albums.length && !data.people.length;
  if (nothing)
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 py-16 text-center">
        <p className="text-2xl font-bold">No results found for “{q}”</p>
        <p className="mx-auto mt-2 max-w-[48ch] text-sub">Romanised spellings vary a lot (Xun, Hun, Shun; Mon, Mun). Try fewer letters, a different spelling, or the album or film name.</p>
      </motion.div>
    );
  const tabs: [Tab, string, number][] = [
    ['all', 'All', 1],
    ['songs', 'Songs', data.songIds.length],
    ['albums', 'Albums', data.albums.length],
    ['people', 'People', data.people.length],
  ];
  return (
    <div className={cx('transition-opacity', loading && 'opacity-60')}>
      <div className="no-scrollbar sticky top-0 z-10 flex gap-2 overflow-x-auto bg-surface/95 px-4 py-3 backdrop-blur md:px-6">
        {tabs.filter(([, , n]) => n > 0).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cx('relative h-8 shrink-0 rounded-full px-3 text-[14px] font-semibold transition-colors', tab === k ? 'text-black' : 'bg-white/[.08] hover:bg-white/[.14]')}>
            {tab === k && <motion.span layoutId="search-tab" className="absolute inset-0 rounded-full bg-white" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
            <span className="relative">{l}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {tab === 'all' && (
            <>
              <div className="grid gap-6 px-4 pt-2 md:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                {data.top && (
                  <section>
                    <h2 className="mb-3 text-[22px] font-bold tracking-tight md:text-2xl">Top result</h2>
                    <TopResult r={data.top} />
                  </section>
                )}
                {data.songIds.length > 0 && (
                  <section className="min-w-0">
                    <h2 className="mb-3 text-[22px] font-bold tracking-tight md:text-2xl">Songs</h2>
                    <div className="-mx-2 md:-mx-6">
                      <TrackList ids={data.songIds.slice(0, 4)} initial={data.songs.slice(0, 4)} ctx={ctx} showCover showAlbum={false} numbered={false} header={false} />
                    </div>
                  </section>
                )}
              </div>
              {data.albums.length > 0 && (
                <Shelf title="Albums and films">
                  {data.albums.map((a) => (
                    <Card key={a.id} href={`/album/${a.id}`} title={a.n} sub={[a.y || '', KIND_LABEL[a.k] || ''].filter(Boolean).join(' · ')} cover={<Cover src={a.img} name={a.n} />} play={{ ctx: { key: 'album:' + a.id, label: a.n, href: `/album/${a.id}`, img: a.img, kind: 'Album' }, type: 'album', key: String(a.id) }} />
                  ))}
                </Shelf>
              )}
              {data.people.length > 0 && (
                <Shelf title="People">
                  {data.people.map((p) => (
                    <Card key={p.n} href={`/person/${encodeURIComponent(p.n)}`} title={p.n} sub={p.roles.join(', ')} round cover={<PersonAvatar name={p.n} className="w-full" />} play={{ ctx: { key: 'person:' + p.n, label: `With ${p.n}`, href: `/person/${encodeURIComponent(p.n)}`, kind: 'Artist' }, type: 'person', key: p.n }} />
                  ))}
                </Shelf>
              )}
              {data.songIds.length > 4 && (
                <section className="mt-8">
                  <h2 className="mb-3 px-4 text-[22px] font-bold tracking-tight md:px-6 md:text-2xl">All matching songs · {fmt(data.songIds.length)}</h2>
                  <TrackList ids={data.songIds} initial={data.songs} ctx={ctx} showCover />
                </section>
              )}
            </>
          )}
          {tab === 'songs' && <TrackList ids={data.songIds} initial={data.songs} ctx={ctx} showCover />}
          {tab === 'albums' && (
            <motion.div className="grid grid-cols-2 gap-1 px-2 xs:grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] md:px-4" initial="hidden" animate="show" variants={staggerVariants}>
              {data.albums.map((a) => (
                <Card key={a.id} fixed={false} href={`/album/${a.id}`} title={a.n} sub={[a.y || '', a.l].filter(Boolean).join(' · ')} cover={<Cover src={a.img} name={a.n} />} play={{ ctx: { key: 'album:' + a.id, label: a.n, href: `/album/${a.id}`, img: a.img, kind: 'Album' }, type: 'album', key: String(a.id) }} />
              ))}
            </motion.div>
          )}
          {tab === 'people' && (
            <motion.div className="grid grid-cols-2 gap-1 px-2 xs:grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] md:px-4" initial="hidden" animate="show" variants={staggerVariants}>
              {data.people.map((p) => (
                <Card key={p.n} fixed={false} round href={`/person/${encodeURIComponent(p.n)}`} title={p.n} sub={`${fmt(p.count)} songs`} cover={<PersonAvatar name={p.n} className="w-full" />} />
              ))}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** On phones there is no top bar, so the search box lives in the page. */
function MobileSearchBox({ q }: { q: string }) {
  const router = useRouter();
  const [v, setV] = useState(q);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setV(q), [q]);
  return (
    <div className="sticky top-0 z-20 bg-surface px-4 pt-4 pb-2 md:hidden">
      <h1 className="mb-3 text-2xl font-bold">Search</h1>
      <div className="flex h-12 items-center gap-2 rounded-md bg-white px-3 text-black">
        <IconSearch size={22} />
        <input
          value={v}
          onChange={(e) => {
            setV(e.target.value);
            if (t.current) clearTimeout(t.current);
            const val = e.target.value;
            t.current = setTimeout(() => router.replace(val ? `/search?q=${encodeURIComponent(val)}` : '/search'), 220);
          }}
          enterKeyHint="search"
          placeholder="What do you want to listen to?"
          aria-label="Search"
          className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold outline-none placeholder:font-semibold placeholder:text-[#555]"
        />
        {v && (
          <button type="button" aria-label="Clear" onClick={() => (setV(''), router.replace('/search'))}>
            <IconClose size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function SearchView() {
  const q = (useSearchParams().get('q') || '').trim();
  return (
    <div className="min-h-full">
      <MobileSearchBox q={q} />
      <div className="md:pt-2">{q ? <Results key={q.length ? 'r' : 'b'} q={q} /> : <Browse />}</div>
    </div>
  );
}
