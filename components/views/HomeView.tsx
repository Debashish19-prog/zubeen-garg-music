'use client';
import Link from 'next/link';
import { AnimatePresence, motion, useTransform } from 'motion/react';
import { useEffect, useState } from 'react';
import type { Album, Song } from '@/lib/types';
import { ABOUT_PHOTO, ARTIST, COLLECTIONS, HERO_PHOTOS, MIXES, NATIVE, TILE_COLORS, collectionMeta, albumHref } from '@/lib/meta';
import { fmt, greeting, rgba } from '@/lib/text';
import { TRIBUTE_SHORT } from '@/lib/tribute';
import { fetchList } from '@/lib/client/api';
import { playContext } from '@/lib/client/menus';
import { useContextState } from '@/lib/client/hooks';
import { useLibrary } from '@/store/library';
import { useOwner } from '@/store/owner';
import { usePlayer } from '@/store/player';
import { useMainScrollY } from '@/components/shell/MainScroll';
import { useShellData } from '@/components/shell/ShellData';
import { Card, Shelf, QuickTile, BrowseTile, staggerVariants } from '@/components/music/Cards';
import TrackList from '@/components/music/TrackList';
import { Cover, LikedCover, PhotoCover } from '@/components/ui/Cover';
import { PlayButton } from '@/components/ui/PlayButton';
import { IconShuffle } from '@/components/ui/Icons';

export interface HomeData {
  essentials: Song[];
  films: Album[];
  albums: Album[];
  big: Album[];
  recent: Album[];
  singles: Album[];
  nineties: Album[];
  bihu: Song[];
  langs: { name: string; count: number }[];
  decades: { d: number; count: number }[];
}

const albumCard = (a: Album) => (
  <Card
    key={a.id}
    href={`/album/${a.id}`}
    title={a.n}
    sub={[a.y || '', a.l].filter(Boolean).join(' · ')}
    cover={<Cover src={a.img} name={a.n} sub={a.y ? String(a.y) : ''} />}
    play={{ ctx: { key: 'album:' + a.id, label: a.n, href: `/album/${a.id}`, img: a.img, kind: 'Album' }, type: 'album', key: String(a.id) }}
  />
);

function Hero({ songs, playable }: { songs: number; playable: number }) {
  const [i, setI] = useState(0);
  const y = useMainScrollY();
  const imgY = useTransform(y, [0, 420], [0, 120]);
  const fade = useTransform(y, [0, 300], [1, 0.25]);
  const nav = useShellData();
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % HERO_PHOTOS.length), 7000);
    return () => clearInterval(t);
  }, [i]);
  return (
    <section className="relative h-[min(440px,58vh)] min-h-[330px] overflow-hidden md:rounded-t-lg">
      <motion.div className="absolute inset-0" style={{ y: imgY }}>
        <AnimatePresence initial={false}>
          <motion.div key={i} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.4, ease: 'easeInOut' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HERO_PHOTOS[i].src} alt={HERO_PHOTOS[i].caption} className="h-full w-full object-cover object-[50%_28%]" style={{ animation: 'kenburns 9s ease-out forwards' }} />
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-black/35 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-transparent" />
      <i className="weave absolute inset-x-0 top-0 block h-2 opacity-90 md:h-2.5" />
      <motion.div className="absolute inset-x-0 bottom-0 px-4 pb-5 md:px-8 md:pb-7" style={{ opacity: fade }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.1 }}>
          <div className="font-bangla flex items-center gap-2 text-[15px] font-bold text-white/90 md:text-lg" lang="as">
            <span className="inline-block h-4 w-4 rounded-full bg-accent shadow-[0_0_0_3px_rgba(226,61,61,.3)]" />
            {ARTIST.native}
          </div>
          <h1 className="mt-1 text-[clamp(48px,9vw,120px)] leading-[0.92] font-black tracking-[-0.035em] drop-shadow-[0_4px_30px_rgba(0,0,0,.45)]">{ARTIST.name}</h1>
          <p className="mt-3 text-[14px] text-white/85 md:text-[16px]">
            {ARTIST.years} · {fmt(songs)} songs in {nav.languages} languages · {fmt(playable)} play right here
          </p>
        </motion.div>
      </motion.div>
      <div className="absolute right-4 bottom-6 hidden gap-1.5 md:flex">
        {HERO_PHOTOS.map((p, k) => (
          <button key={p.id} type="button" aria-label={`Photo ${k + 1}: ${p.caption}`} onClick={() => setI(k)} className="relative h-1.5 w-7 overflow-hidden rounded-full bg-white/30">
            {k === i && <motion.span className="absolute inset-0 origin-left rounded-full bg-white" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 7, ease: 'linear' }} />}
            {k < i && <span className="absolute inset-0 rounded-full bg-white/80" />}
          </button>
        ))}
      </div>
      <span className="absolute top-4 right-4 hidden text-[11px] text-white/50 md:block">Photo: {HERO_PHOTOS[i].credit}</span>
    </section>
  );
}

function ShuffleAll() {
  const { playing } = useContextState('all|playable');
  const [busy, setBusy] = useState(false);
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      onClick={async () => {
        if (playing) return usePlayer.getState().toggle();
        setBusy(true);
        try {
          const p = await fetchList('all', '', { play: 'any' }, 20);
          usePlayer.getState().playList(p.ids, 0, { key: 'all|playable', label: 'Everything playable', href: '/songs', kind: 'Shuffle' }, { shuffle: true });
        } finally {
          setBusy(false);
        }
      }}
      className="flex h-10 items-center gap-2 rounded-full border border-white/30 px-4 text-[14px] font-bold text-white transition-colors hover:border-white disabled:opacity-60"
      disabled={busy}
    >
      <IconShuffle size={18} /> {busy ? 'Shuffling…' : 'Shuffle everything'}
    </motion.button>
  );
}

export default function HomeView({ data }: { data: HomeData }) {
  const nav = useShellData();
  const recents = useLibrary((s) => s.recents);
  const likes = useLibrary((s) => s.likes);
  const loaded = useLibrary((s) => s.loaded);
  const [tint, setTint] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [hello, setHello] = useState('Hello');
  useEffect(() => setHello(greeting()), []);
  const ess = data.essentials;
  const essIds = ess.map((s) => s.id);
  const essCtx = { key: 'col:essentials', label: 'The Essentials', href: '/collection/essentials', kind: 'Collection', img: collectionMeta('essentials')!.photo };
  const { playing } = useContextState(essCtx.key);
  const baseTint = '#5a1d1d';

  const quick = [
    { key: 'liked', href: '/liked', title: 'Liked Songs', cover: <LikedCover rounded="rounded-none" />, color: '#7a1414', play: { ctx: { key: 'liked', label: 'Liked Songs', href: '/liked', kind: 'Playlist' }, ids: likes.map((l) => l.id) } },
    ...['essentials', 'mix-daily', 'bihu', 'film', 'mix-full', 'mix-hindi', 'devotional'].map((k) => {
      const c = collectionMeta(k)!;
      return { key: k, href: `/collection/${k}`, title: c.name, cover: <PhotoCover src={c.photo} name={c.name} color={c.color} rounded="rounded-none" compact />, color: c.color, play: { ctx: { key: 'col:' + k, label: c.name, href: `/collection/${k}`, img: c.photo, kind: c.mix ? 'Mix' : 'Collection' }, type: 'col' as const, key: k } };
    }),
  ];

  return (
    <div>
      <Hero songs={nav.songs} playable={nav.playable} />

      <div className="relative">
        <motion.div className="pointer-events-none absolute inset-x-0 top-0 h-[340px]" animate={{ background: `linear-gradient(${rgba(tint || baseTint, 0.55)}, rgba(18,18,18,0))` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-4 px-4 py-5 md:gap-6 md:px-6">
            <PlayButton size={56} playing={playing} onClick={() => playContext(essIds, essCtx)} label={playing ? 'Pause' : 'Play the essentials'} />
            <ShuffleAll />
            <Link href="/about" className="ml-auto hidden text-[14px] font-bold text-sub hover:text-white hover:underline sm:block">
              About Zubeen
            </Link>
          </div>

          <h2 className="px-4 pt-1 pb-3 text-[24px] font-bold tracking-tight md:px-6 md:text-[28px]">{hello}</h2>
          <motion.div className="grid grid-cols-2 gap-2 px-4 md:px-6 lg:grid-cols-4" initial="hidden" animate="show" variants={staggerVariants}>
            {quick.map((q) => (
              <QuickTile key={q.key} href={q.href} title={q.title} cover={q.cover} play={q.play} onHover={(on) => setTint(on ? q.color : null)} />
            ))}
          </motion.div>
        </div>
      </div>

      {loaded && recents.length > 0 && (
        <Shelf title="Jump back in" sub="Recently played">
          {recents.slice(0, 12).map((r) => (
            <Card key={r.href} href={r.href} title={r.label} sub={r.kind || r.sub} cover={<Cover src={r.img} name={r.label} />} />
          ))}
        </Shelf>
      )}

      <section className="mt-8">
        <h2 className="px-4 text-[22px] font-bold tracking-tight md:px-6 md:text-2xl">Popular</h2>
        <div className="mt-3">
          <TrackList ids={showMore ? essIds : essIds.slice(0, 10)} initial={ess} ctx={essCtx} showCover showAlbum={false} header={false} />
        </div>
        {essIds.length > 10 && (
          <button type="button" onClick={() => setShowMore(!showMore)} className="mt-2 ml-4 text-[14px] font-bold text-sub hover:text-white md:ml-10">
            {showMore ? 'Show less' : 'See more'}
          </button>
        )}
      </section>

      <RecentUploads />

      <Shelf title="Made for you" sub="Mixes, reshuffled daily">
        {MIXES.map((m) => (
          <Card key={m.key} href={`/collection/${m.key}`} title={m.name} sub={m.blurb} cover={<PhotoCover src={m.photo} name={m.name} color={m.color} mix />} play={{ ctx: { key: 'col:' + m.key, label: m.name, href: `/collection/${m.key}`, img: m.photo, kind: 'Mix' }, type: 'col', key: m.key }} />
        ))}
      </Shelf>

      <Shelf title="Films" href="/albums?kind=Film%20songs">
        {data.films.map(albumCard)}
      </Shelf>

      <Shelf title="Bihu" sub="For Rongali" href="/collection/bihu">
        {data.bihu.map((s, k) => (
          <Card
            key={s.id}
            href={albumHref(s)}
            title={s.t}
            sub={`${s.an}${s.y ? ' · ' + s.y : ''}`}
            cover={<Cover src={s.img} name={s.an} />}
            play={{ ctx: { key: 'bihu-shelf:' + s.id, label: 'Bihu', href: '/collection/bihu', kind: 'Collection' }, ids: data.bihu.map((x) => x.id), start: k }}
          />
        ))}
      </Shelf>

      <Shelf title="Albums" href="/albums?kind=Album%20songs">
        {data.albums.map(albumCard)}
      </Shelf>

      <Shelf title="Collections">
        {COLLECTIONS.filter((c) => c.key !== 'essentials').map((c) => (
          <Card key={c.key} href={`/collection/${c.key}`} title={c.name} sub={c.blurb} cover={<PhotoCover src={c.photo} name={c.name} color={c.color} />} play={{ ctx: { key: 'col:' + c.key, label: c.name, href: `/collection/${c.key}`, img: c.photo, kind: 'Collection' }, type: 'col', key: c.key }} />
        ))}
      </Shelf>

      <Shelf title="Released since 2024" href="/albums?sort=new">
        {data.recent.map(albumCard)}
      </Shelf>

      <Shelf title="Where it began" sub="The 90s">
        {data.nineties.map(albumCard)}
      </Shelf>

      <Shelf title="Biggest albums" href="/albums">
        {data.big.map(albumCard)}
      </Shelf>

      <section className="mt-8 px-4 md:px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-[22px] font-bold tracking-tight md:text-2xl">Languages he sang in</h2>
          <Link href="/languages" className="pb-1 text-[13px] font-bold text-sub hover:text-white hover:underline">
            Show all
          </Link>
        </div>
        <motion.div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerVariants}>
          {data.langs.map((l, k) => (
            <BrowseTile key={l.name} href={`/language/${encodeURIComponent(l.name)}`} title={l.name} sub={`${fmt(l.count)} songs`} color={TILE_COLORS[k % TILE_COLORS.length]} glyph={NATIVE[l.name] && NATIVE[l.name] !== l.name ? NATIVE[l.name] : undefined} />
          ))}
        </motion.div>
      </section>

      <section className="mt-8 px-4 md:px-6">
        <h2 className="text-[22px] font-bold tracking-tight md:text-2xl">Across the decades</h2>
        <motion.div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4" initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerVariants}>
          {data.decades.map((d, k) => (
            <BrowseTile key={d.d} href={`/decade/${d.d}`} title={`The ${String(d.d).slice(2)}s`} sub={`${fmt(d.count)} songs`} color={TILE_COLORS[(k * 5 + 3) % TILE_COLORS.length]} glyph={`’${String(d.d).slice(2)}`} />
          ))}
        </motion.div>
      </section>

      <section className="mt-10 px-4 md:px-6">
        <h2 className="text-[22px] font-bold tracking-tight md:text-2xl">About the artist</h2>
        <Link href="/about" className="group relative mt-3 block h-[min(520px,70vw)] min-h-[300px] max-w-[880px] overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ABOUT_PHOTO} alt="Zubeen Garg, studio portrait" className="absolute inset-0 h-full w-full object-cover object-[50%_20%] transition-transform duration-[1.2s] ease-[var(--ease-out-quint)] group-hover:scale-[1.04]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
            <div className="text-[13px] font-bold tracking-[0.16em] text-white/70 uppercase">Who was Zubeen Garg</div>
            <p className="mt-2 line-clamp-4 max-w-[60ch] text-[15px] text-white/85">{TRIBUTE_SHORT}</p>
            <span className="mt-3 inline-flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-bold text-black transition-transform group-hover:scale-[1.04]">Read his story</span>
          </div>
        </Link>
      </section>

      <footer className="mt-12 border-t border-white/10 px-4 py-8 text-[13px] text-sub md:px-6">
        <p className="max-w-[80ch]">
          A fan-made tribute. This site hosts no audio: every song plays through the official player of the service that has it (YouTube, Apple Music previews, Spotify or JioSaavn), or links out. Photos belong to their photographers; see{' '}
          <Link href="/about#photos" className="text-white hover:underline">
            photo credits
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}

/** The newest uploads, as a short track list: they play in full, so they lead. */
function RecentUploads() {
  const ids = useOwner((s) => s.uploadIds);
  if (!ids.length) return null;
  const ctx = { key: 'uploads', label: 'Uploads', href: '/uploads', kind: 'Playlist' };
  return (
    <motion.section className="mt-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-2 flex items-end justify-between px-4 md:px-6">
        <div>
          <p className="text-[13px] text-sub">Full songs, start to finish</p>
          <Link href="/uploads" className="text-[clamp(20px,2.4vw,24px)] font-bold tracking-tight hover:underline">
            Recently uploaded
          </Link>
        </div>
        {ids.length > 5 && (
          <Link href="/uploads" className="text-[14px] font-bold text-sub hover:text-white hover:underline">
            Show all
          </Link>
        )}
      </div>
      <TrackList ids={ids.slice(0, 5)} ctx={ctx} showCover showAlbum={false} header={false} />
    </motion.section>
  );
}
