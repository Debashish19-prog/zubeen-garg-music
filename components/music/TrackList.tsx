'use client';
import Link from 'next/link';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { PlayContext, Song } from '@/lib/types';
import { SRC_INFO, sourcesOf, albumHref, artistOf } from '@/lib/meta';
import { mmss } from '@/lib/text';
import { getSongs, peek, prime } from '@/lib/client/songCache';
import { openSongMenu } from '@/lib/client/menus';
import { useCoarsePointer } from '@/lib/client/hooks';
import { usePlayer } from '@/store/player';
import { useLibrary } from '@/store/library';
import { useOverlayVersion } from '@/store/owner';
import { Cover } from '@/components/ui/Cover';
import { Equalizer } from '@/components/ui/PlayButton';
import { IconClock, IconHeart, IconHeartOutline, IconMore, IconPause, IconPlay } from '@/components/ui/Icons';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
const CHUNK = 80;

const ago = (t: number) => {
  const d = (Date.now() - t) / 1000;
  if (d < 3600) return `${Math.max(1, Math.round(d / 60))} min ago`;
  if (d < 86400) return `${Math.round(d / 3600)} hr ago`;
  if (d < 86400 * 30) return `${Math.round(d / 86400)} days ago`;
  return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

function playsAs(s: Song, preferFull: boolean) {
  const k = sourcesOf(s, preferFull)[0];
  if (!k) return { text: 'Links only', cls: 'text-dim/80' };
  return { text: SRC_INFO[k].short, cls: k === 'tg' ? 'text-accent-hi' : k === 'yt' ? 'text-muga' : k === 'sp' ? 'text-[#7fd08a]' : k === 'sa' ? 'text-[#7fc3b0]' : 'text-sub' };
}

interface RowProps {
  s: Song;
  index: number;
  isCurrent: boolean;
  playing: boolean;
  liked: boolean;
  selected: boolean;
  showCover: boolean;
  showAlbum: boolean;
  numbered: boolean;
  added?: number;
  preferFull: boolean;
  playlistId?: string;
  coarse: boolean;
  animDelay: number;
  onPlay: (index: number) => void;
  onSelect: (id: number) => void;
}

const Row = memo(function Row({ s, index, isCurrent, playing, liked, selected, showCover, showAlbum, numbered, added, preferFull, playlistId, coarse, animDelay, onPlay, onSelect }: RowProps) {
  const pa = playsAs(s, preferFull);
  const sub = artistOf(s);
  return (
    <div
      role="row"
      tabIndex={0}
      aria-selected={selected}
      draggable={!coarse}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-zg-songs', JSON.stringify([s.id]));
        e.dataTransfer.setData('text/plain', s.t);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => (coarse ? onPlay(index) : onSelect(s.id))}
      onDoubleClick={() => !coarse && onPlay(index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onPlay(index);
      }}
      onContextMenu={(e) => openSongMenu(e, s, { playlistId })}
      className={cx(
        'tl-row group h-14 rounded-md outline-none select-none transition-colors duration-150 [animation:rowin_.45s_var(--ease-out-quint)_backwards] focus-visible:bg-white/10',
        showAlbum && 'has-album',
        selected ? 'bg-white/20' : 'hover:bg-white/10',
      )}
      style={{ animationDelay: animDelay + 'ms' }}
    >
      <div className="c-idx relative h-full items-center justify-end text-[15px] text-sub tabular">
        <span className={cx('group-hover:invisible', coarse && 'invisible')}>
          {isCurrent && playing ? <Equalizer className="text-accent" /> : <span className={cx(isCurrent && 'text-accent')}>{numbered ? index + 1 : <span className="opacity-0">•</span>}</span>}
        </span>
        <button
          type="button"
          aria-label={isCurrent && playing ? `Pause ${s.t}` : `Play ${s.t}`}
          onClick={(e) => {
            e.stopPropagation();
            onPlay(index);
          }}
          className="invisible absolute inset-y-0 right-0 grid place-items-center text-white group-hover:visible"
        >
          {isCurrent && playing ? <IconPause size={16} /> : <IconPlay size={16} />}
        </button>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        {showCover && (
          <div className="relative w-10 shrink-0">
            <Cover src={s.img} name={s.an} rounded="rounded" textSize="text-[6px]" />
          </div>
        )}
        <div className="min-w-0">
          <div className={cx('truncate text-[15.5px] leading-tight', isCurrent ? 'text-accent' : 'text-white')}>{s.t}</div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13.5px] text-sub">
            {isCurrent && playing && coarse && <Equalizer className="h-3 w-3 shrink-0 text-accent" />}
            <span className="truncate">{showAlbum ? sub : showCover ? `${sub} · ${s.an}` : sub}</span>
          </div>
        </div>
      </div>

      {showAlbum && (
        <Link href={albumHref(s)} onClick={(e) => e.stopPropagation()} className="c-album truncate text-[14px] text-sub hover:text-white hover:underline">
          {s.an}
        </Link>
      )}
      <div className="c-year truncate text-[14px] text-sub tabular">{added ? ago(added) : s.y || '—'}</div>
      <div className={cx('c-plays truncate text-[13px] font-semibold', pa.cls)}>{pa.text}</div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          aria-label={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
          onClick={(e) => {
            e.stopPropagation();
            useLibrary.getState().toggleLike(s.id);
          }}
          className={cx('c-like grid h-8 w-8 place-items-center rounded-full transition-[opacity,transform] hover:scale-110', liked ? 'text-accent opacity-100' : 'text-sub opacity-0 group-hover:opacity-100 hover:text-white')}
        >
          {liked ? <IconHeart size={17} /> : <IconHeartOutline size={17} />}
        </button>
        <span className="c-dur w-10 justify-end text-[14px] text-sub tabular">{s.d ? mmss(s.d) : ''}</span>
        <button
          type="button"
          aria-label={`More options for ${s.t}`}
          onClick={(e) => openSongMenu(e, s, { playlistId })}
          className={cx('grid h-8 w-8 place-items-center rounded-full text-sub hover:text-white', !coarse && 'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100')}
        >
          <IconMore size={18} />
        </button>
      </div>
    </div>
  );
});

export default function TrackList({
  ids,
  initial = [],
  ctx,
  showCover = false,
  showAlbum = true,
  numbered = true,
  playlistId,
  addedAt,
  empty,
  header = true,
}: {
  ids: number[];
  initial?: Song[];
  ctx: PlayContext;
  showCover?: boolean;
  showAlbum?: boolean;
  numbered?: boolean;
  playlistId?: string;
  addedAt?: Record<number, number>;
  empty?: React.ReactNode;
  header?: boolean;
}) {
  useMemo(() => prime(initial), [initial]);
  const [count, setCount] = useState(Math.min(ids.length, CHUNK));
  const [, bump] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const loading = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const coarse = useCoarsePointer();
  const animBase = useRef(0);

  const curId = usePlayer((s) => s.current?.id ?? -1);
  const status = usePlayer((s) => s.status);
  const preferFull = usePlayer((s) => s.preferFull);
  const liked = useLibrary((s) => s.liked);
  useOverlayVersion(); // re-read songs from the cache when an upload adds or removes a file
  const playing = status === 'playing' || status === 'loading' || status === 'external';

  // reset when the list changes (filters, new page)
  const sig = ids.length + ':' + ids.slice(0, 5).join(',');
  useEffect(() => {
    const n = Math.min(ids.length, CHUNK);
    setCount(n);
    animBase.current = 0;
    const missing = ids.slice(0, n).filter((i) => !peek(i));
    if (missing.length) void getSongs(missing).then(() => bump((x) => x + 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        if (!es[0].isIntersecting || loading.current || count >= ids.length) return;
        loading.current = true;
        const next = ids.slice(count, count + CHUNK);
        void getSongs(next).then(() => {
          loading.current = false;
          animBase.current = count;
          setCount((c) => Math.min(ids.length, c + CHUNK));
        });
      },
      { rootMargin: '0px 0px 900px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [count, ids]);

  // header row gets a background once it sticks
  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(e.intersectionRatio < 1 && e.boundingClientRect.top < 120), { threshold: [1], rootMargin: '-65px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onPlay = useMemo(
    () => (index: number) => {
      const pl = usePlayer.getState();
      if (pl.current?.id === ids[index] && pl.context?.key === ctx.key) return pl.toggle();
      pl.playList(ids, index, ctx);
    },
    [ids, ctx],
  );
  const onSelect = useMemo(() => (id: number) => setSelected(id), []);

  if (!ids.length) return <div className="px-4 py-10 text-sub md:px-6">{empty ?? 'No songs here.'}</div>;

  return (
    <div className="tl px-2 md:px-6" role="grid" aria-label={ctx.label}>
      {header && (
        <div ref={headRef} className={cx('tl-row tl-head sticky top-16 z-10 mb-2 h-9 border-b border-white/10 text-[13px] font-medium text-sub transition-colors', showAlbum && 'has-album', stuck ? 'bg-[#1a1a1a] shadow-[0_6px_12px_-6px_rgba(0,0,0,.6)]' : 'bg-transparent')}>
          <div className="c-idx justify-end">#</div>
          <div>Title</div>
          {showAlbum && <div className="c-album">Album</div>}
          <div className="c-year">{addedAt ? 'Date added' : 'Year'}</div>
          <div className="c-plays">Plays as</div>
          <div className="flex justify-end pr-11">
            <IconClock size={16} aria-label="Duration" />
          </div>
        </div>
      )}
      <div>
        {ids.slice(0, count).map((id, index) => {
          const s = peek(id);
          if (!s) return <div key={id + ':' + index} className="mx-3 my-2 h-10 rounded shimmer" />;
          return (
            <Row
              key={id + ':' + index}
              s={s}
              index={index}
              isCurrent={s.id === curId}
              playing={s.id === curId && playing}
              liked={liked.has(s.id)}
              selected={selected === s.id}
              showCover={showCover}
              showAlbum={showAlbum}
              numbered={numbered}
              added={addedAt?.[s.id]}
              preferFull={preferFull}
              playlistId={playlistId}
              coarse={coarse}
              animDelay={index - animBase.current < 30 && index >= animBase.current ? (index - animBase.current) * 14 : 0}
              onPlay={onPlay}
              onSelect={onSelect}
            />
          );
        })}
      </div>
      <div ref={sentinel} className="h-px" />
      {count < ids.length && (
        <motion.div className="flex justify-center py-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
        </motion.div>
      )}
    </div>
  );
}
