'use client';
import Link from 'next/link';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import { useEffect, useState } from 'react';
import type { Song } from '@/lib/types';
import { ARTIST, ARTIST_AVATAR, LABEL_KIND, SRC_INFO, albumHref, artistOf } from '@/lib/meta';
import { TRIBUTE_SHORT } from '@/lib/tribute';
import { fmt, longDuration } from '@/lib/text';
import { getSongs, peek } from '@/lib/client/songCache';
import { openSongMenu } from '@/lib/client/menus';
import { usePlayer, useShowsMedia } from '@/store/player';
import { useUI } from '@/store/ui';
import { Cover } from '@/components/ui/Cover';
import { Equalizer } from '@/components/ui/PlayButton';
import { IconClose, IconExternal, IconGrip, IconMore, IconPlay, IconSearch } from '@/components/ui/Icons';
import { useShellData } from '@/components/shell/ShellData';
import { LikeButton, VideoToggle } from './Controls';
import { MediaSlot } from './MediaSlot';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

function Card({ title, children, className }: { title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <motion.section layout="position" className={cx('rounded-lg bg-[#1f1f1f] p-4', className)}>
      {title && <h3 className="mb-3 text-[16px] font-bold">{title}</h3>}
      {children}
    </motion.section>
  );
}

function QueueRowStatic({ s, active, onClick }: { s: Song; active?: boolean; onClick?: () => void }) {
  const status = usePlayer((st) => st.status);
  return (
    <button type="button" onClick={onClick} onContextMenu={(e) => openSongMenu(e, s)} className="group flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-white/10">
      <div className="relative h-12 w-12 shrink-0">
        <Cover src={s.img} name={s.an} rounded="rounded" textSize="text-[6px]" />
        {!active && (
          <span className="absolute inset-0 hidden place-items-center rounded bg-black/50 group-hover:grid">
            <IconPlay size={18} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cx('flex items-center gap-2 truncate text-[15px]', active ? 'text-accent' : 'text-white')}>
          {active && status === 'playing' && <Equalizer className="h-3 w-3 shrink-0" />}
          <span className="truncate">{s.t}</span>
        </div>
        <div className="truncate text-[13px] text-sub">{artistOf(s)}</div>
      </div>
    </button>
  );
}

function NowPlayingView() {
  const s = usePlayer((st) => st.current);
  const source = usePlayer((st) => st.source);
  const sources = usePlayer((st) => st.sources);
  const preferFull = usePlayer((st) => st.preferFull);
  const media = useShowsMedia();
  const ctx = usePlayer((st) => st.context);
  const nextId = usePlayer((st) => (st.pos + 1 < st.order.length ? st.queue[st.order[st.pos + 1]] : null));
  const [, bump] = useState(0);
  const nav = useShellData();
  useEffect(() => {
    if (nextId != null && !peek(nextId)) void getSongs([nextId]).then(() => bump((x) => x + 1));
  }, [nextId]);
  const next = nextId != null ? peek(nextId) : null;

  if (!s)
    return (
      <div className="grid flex-1 place-items-center p-6 text-center text-sub">
        <div>
          <p className="text-lg font-bold text-white">Nothing playing yet</p>
          <p className="mt-1 text-sm">Pick a song and its artwork, credits and players show up here.</p>
        </div>
      </div>
    );

  const credits: [string, string][] = (
    [
      ...(s.k === LABEL_KIND
        ? [['Singer', s.c], ['Label', 'Zubeen Garg Music']]
        : [['Main artist', 'Zubeen Garg'], ['With', s.c]]),
      ['Music', s.m],
      ['Lyrics', s.w],
      ['Language', s.l],
      ['Year', s.y ? String(s.y) : ''],
      ['Listed on', s.src],
    ] as [string, string][]
  ).filter((x) => x[1]);
  const yts = 'https://www.youtube.com/results?search_query=' + encodeURIComponent('Zubeen Garg ' + s.t);

  return (
    <div data-slot-clip className="scroll-y flex-1 px-4 pb-6">
      <div className="pt-1">
        {media ? (
          <MediaSlot name="panel" priority={2} z={30} />
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={s.id} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }} className="shadow-[0_8px_32px_rgba(0,0,0,.5)]">
              <Cover src={s.img} name={s.an} sub={s.y ? String(s.y) : ''} rounded="rounded-lg" textSize="text-[26px]" />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      <div className="mt-4 flex items-start gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={s.id} className="min-w-0 flex-1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Link href={albumHref(s)} className="line-clamp-2 text-2xl leading-tight font-bold tracking-tight hover:underline">
              {s.t}
            </Link>
            <div className="mt-1 truncate text-[15px] text-sub">{artistOf(s)}</div>
          </motion.div>
        </AnimatePresence>
        <LikeButton id={s.id} size={22} />
      </div>

      {sources.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {sources.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => usePlayer.getState().useSource(k)}
              title={SRC_INFO[k].long}
              className={cx('h-8 rounded-full px-3 text-[13px] font-semibold transition-colors', source === k ? 'bg-white text-black' : 'bg-white/[.08] text-white hover:bg-white/[.14]')}
            >
              {SRC_INFO[k].short === SRC_INFO[k].via ? SRC_INFO[k].short : `${SRC_INFO[k].short} · ${SRC_INFO[k].via}`}
            </button>
          ))}
          <VideoToggle pill />
        </div>
      )}
      {source === 'sa' && <p className="mt-3 rounded-md bg-[#7fc3b0]/10 px-3 py-2 text-[13px] text-[#a9dccd]">JioSaavn plays inside its own album player: find “{s.t}” in the list above and press play there.</p>}
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-sub">
        <input type="checkbox" checked={preferFull} onChange={(e) => usePlayer.getState().setPreferFull(e.target.checked)} className="h-4 w-4 accent-[#e23d3d]" />
        Prefer full-length players over 30-second previews
      </label>

      <div className="mt-5 space-y-4">
        <Link href="/about" className="group block overflow-hidden rounded-lg bg-[#1f1f1f]">
          <div className="relative h-[220px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ARTIST_AVATAR} alt="" className="h-full w-full object-cover object-[50%_25%] transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
            <span className="absolute top-3 left-4 text-[15px] font-bold">About the artist</span>
          </div>
          <div className="p-4">
            <div className="text-[16px] font-bold">{ARTIST.name}</div>
            <div className="mt-1 text-[14px] text-sub">
              {fmt(nav.songs)} songs in this catalogue, in {nav.languages} languages
            </div>
            <p className="mt-2 line-clamp-4 text-[14px] text-sub">{TRIBUTE_SHORT}</p>
          </div>
        </Link>

        <Card title="Credits">
          <dl className="space-y-3">
            {credits.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[13px] text-sub">{k}</dt>
                <dd className="text-[15px] font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {s.n && <p className="mt-3 text-[13px] text-sub">{s.n}</p>}
        </Card>

        {next && (
          <Card
            title={
              <span className="flex items-center justify-between">
                Next in queue
                <button type="button" onClick={() => useUI.getState().setPanel('queue')} className="text-[13px] font-bold text-sub hover:text-white hover:underline">
                  Open queue
                </button>
              </span>
            }
          >
            <QueueRowStatic s={next} onClick={() => usePlayer.getState().next()} />
          </Card>
        )}

        <Card title="Listen elsewhere">
          <div className="-mx-2">
            {Object.entries(s.L || {}).map(([k, u]) => (
              <a key={k} href={u} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-md px-2 py-2 text-[14px] hover:bg-white/10">
                {k.replace('Source: ', '')}
                <IconExternal size={15} className="text-sub" />
              </a>
            ))}
            <a href={yts} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-md px-2 py-2 text-[14px] hover:bg-white/10">
              Search YouTube for this song
              <IconSearch size={15} className="text-sub" />
            </a>
          </div>
        </Card>
        {ctx?.href && (
          <p className="px-1 text-[13px] text-sub">
            Playing from{' '}
            <Link href={ctx.href} className="font-bold text-white hover:underline">
              {ctx.label}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

function QueueItem({ k, s, onJump, onRemove }: { k: number; s: Song | undefined; onJump: () => void; onRemove: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={k} dragListener={false} dragControls={controls} className="group relative flex items-center rounded-md bg-surface hover:bg-white/10" whileDrag={{ scale: 1.03, boxShadow: '0 12px 30px rgba(0,0,0,.6)', zIndex: 5 }} layout="position">
      <span onPointerDown={(e) => controls.start(e)} className="grid h-12 w-6 shrink-0 cursor-grab touch-none place-items-center text-sub opacity-60 group-hover:opacity-100 active:cursor-grabbing" aria-label="Drag to reorder">
        <IconGrip size={16} />
      </span>
      <div className="min-w-0 flex-1">{s ? <QueueRowStatic s={s} onClick={onJump} /> : <div className="m-2 h-12 rounded shimmer" />}</div>
      <button type="button" aria-label="Remove from queue" onClick={onRemove} className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sub opacity-0 group-hover:opacity-100 hover:text-white md:opacity-0">
        <IconClose size={16} />
      </button>
    </Reorder.Item>
  );
}

export function QueueView() {
  const current = usePlayer((st) => st.current);
  const queue = usePlayer((st) => st.queue);
  const order = usePlayer((st) => st.order);
  const pos = usePlayer((st) => st.pos);
  const ctx = usePlayer((st) => st.context);
  const [, bump] = useState(0);
  const upcoming = order.slice(pos + 1, pos + 51);
  const ids = upcoming.map((k) => queue[k]);
  const sig = ids.join(',');
  useEffect(() => {
    const missing = ids.filter((i) => !peek(i));
    if (missing.length) void getSongs(missing).then(() => bump((x) => x + 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  if (!current) return <p className="p-4 text-sub">The queue is empty. Play an album or a list and it shows up here.</p>;
  return (
    <div className="scroll-y flex-1 px-2 pb-6">
      <h3 className="px-2 pt-1 pb-2 text-[16px] font-bold">Now playing</h3>
      <QueueRowStatic s={current} active />
      <div className="mt-5 flex items-center justify-between px-2 pb-2">
        <h3 className="truncate text-[16px] font-bold">
          Next from: <span className="text-sub">{ctx?.label || 'your queue'}</span>
        </h3>
        {upcoming.length > 0 && (
          <button type="button" onClick={() => usePlayer.getState().clearUpcoming()} className="shrink-0 text-[13px] font-bold text-sub hover:text-white hover:underline">
            Clear
          </button>
        )}
      </div>
      {upcoming.length ? (
        <Reorder.Group axis="y" values={upcoming} onReorder={(v) => usePlayer.getState().reorderUpcoming(v)} className="space-y-0.5">
          {upcoming.map((k, n) => (
            <QueueItem key={k} k={k} s={peek(queue[k])} onJump={() => usePlayer.getState().jump(pos + 1 + n)} onRemove={() => usePlayer.getState().removeAt(pos + 1 + n)} />
          ))}
        </Reorder.Group>
      ) : (
        <p className="px-2 text-[14px] text-sub">Nothing after this song.</p>
      )}
      {order.length - pos - 1 > 50 && <p className="px-2 pt-3 text-[13px] text-sub">…and {fmt(order.length - pos - 51)} more.</p>}
      {upcoming.length > 0 && <p className="px-2 pt-4 text-[12px] text-dim">Next {upcoming.length} songs: {longDuration(upcoming.reduce((a, k) => a + (peek(queue[k])?.d || 0), 0), true) || 'length unknown'}</p>}
    </div>
  );
}

/** Right-hand panel (desktop): Now Playing view or Queue; slides open and closed. */
export default function RightPanel() {
  const panel = useUI((u) => u.panel);
  const ctxLabel = usePlayer((st) => st.context?.label);
  const s = usePlayer((st) => st.current);
  return (
    <AnimatePresence initial={false}>
      {panel && (
        <motion.aside
          key="panel"
          aria-label={panel === 'now' ? 'Now playing' : 'Queue'}
          className="hidden min-h-0 shrink-0 overflow-hidden rounded-lg bg-surface md:flex"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 'var(--panel-w)', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 36 }}
        >
          <div className="flex w-[var(--panel-w)] min-w-[var(--panel-w)] flex-col">
            <div className="flex h-16 shrink-0 items-center gap-2 px-4">
              <span className="min-w-0 flex-1 truncate text-[16px] font-bold">{panel === 'now' ? ctxLabel || s?.an || 'Now playing' : 'Queue'}</span>
              {panel === 'now' && s && (
                <button type="button" aria-label="More options" onClick={(e) => openSongMenu(e, s)} className="grid h-8 w-8 place-items-center rounded-full text-sub hover:bg-white/10 hover:text-white">
                  <IconMore size={18} />
                </button>
              )}
              <button type="button" aria-label="Close" data-tip="Close" data-tip-pos="bottom" onClick={() => useUI.getState().setPanel(null)} className="grid h-8 w-8 place-items-center rounded-full text-sub hover:bg-white/10 hover:text-white">
                <IconClose size={18} />
              </button>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={panel} className="flex min-h-0 flex-1 flex-col" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
                {panel === 'now' ? <NowPlayingView /> : <QueueView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
