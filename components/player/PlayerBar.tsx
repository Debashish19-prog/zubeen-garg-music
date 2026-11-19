'use client';
import { albumHref, artistOf } from '@/lib/meta';
import Link from 'next/link';
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from 'motion/react';
import { usePlayer } from '@/store/player';
import { useUI } from '@/store/ui';
import { useArtColor, useIsMobile } from '@/lib/client/hooks';
import { openSongMenu } from '@/lib/client/menus';
import { Cover } from '@/components/ui/Cover';
import { PlayGlyph } from '@/components/ui/PlayButton';
import { IconChevronDown, IconExpand, IconNowPlaying, IconQueue } from '@/components/ui/Icons';
import { LikeButton, Progress, SourceBadge, TransportControls, VideoToggle, Volume, useLiveTime } from './Controls';
import { useEffect, useRef } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

function NowPlayingInfo() {
  const s = usePlayer((st) => st.current);
  const fullscreen = useUI((u) => u.fullscreen);
  const panel = useUI((u) => u.panel);
  const mobile = useIsMobile();
  if (!s) return <div className="text-[13px] text-sub">Pick a song to start listening.</div>;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="group relative h-14 w-14 shrink-0">
        {!fullscreen && (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={s.id}
              layoutId={mobile ? undefined : 'np-cover'}
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="h-14 w-14 overflow-hidden rounded shadow-lg"
            >
              <Cover src={s.img} name={s.an} rounded="rounded" textSize="text-[7px]" />
            </motion.div>
          </AnimatePresence>
        )}
        <button
          type="button"
          aria-label={panel === 'now' ? 'Hide Now Playing view' : 'Show Now Playing view'}
          onClick={() => useUI.getState().togglePanel('now')}
          className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          <IconChevronDown size={14} className={panel === 'now' ? '' : 'rotate-180'} />
        </button>
      </div>
      <div className="min-w-0">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} className="min-w-0">
            <Link href={albumHref(s)} className="block truncate text-[14px] font-medium text-white hover:underline">
              {s.t}
            </Link>
            <div className="truncate text-[12px] text-sub">
              {artistOf(s)}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <LikeButton id={s.id} size={16} />
    </div>
  );
}

/** Desktop player bar (Spotify layout: now playing | transport + progress | extras). */
export default function PlayerBar() {
  const panel = useUI((u) => u.panel);
  const togglePanel = useUI((u) => u.togglePanel);
  const setFullscreen = useUI((u) => u.setFullscreen);
  const hasSong = usePlayer((s) => !!s.current);
  const btn = (on: boolean) => cx('relative grid h-8 w-8 place-items-center transition-colors', on ? 'text-accent' : 'text-sub hover:text-white');
  return (
    <footer aria-label="Player" className="hidden h-[var(--bar-h)] shrink-0 grid-cols-[minmax(180px,3fr)_minmax(320px,4fr)_minmax(180px,3fr)] items-center gap-4 px-2 md:grid">
      <NowPlayingInfo />
      <div className="flex flex-col items-center gap-1">
        <TransportControls />
        <Progress className="max-w-[720px]" />
      </div>
      <div className="flex items-center justify-end gap-1">
        <div className="mr-1 hidden xl:block">
          <SourceBadge />
        </div>
        <VideoToggle />
        <button type="button" aria-label="Now playing view" aria-pressed={panel === 'now'} data-tip="Now playing view" className={btn(panel === 'now')} onClick={() => togglePanel('now')}>
          <IconNowPlaying size={16} />
          {panel === 'now' && <span className="absolute bottom-0 h-1 w-1 rounded-full bg-accent" />}
        </button>
        <button type="button" aria-label="Queue" aria-pressed={panel === 'queue'} data-tip="Queue" className={btn(panel === 'queue')} onClick={() => togglePanel('queue')}>
          <IconQueue size={16} />
          {panel === 'queue' && <span className="absolute bottom-0 h-1 w-1 rounded-full bg-accent" />}
        </button>
        <Volume />
        <button type="button" aria-label="Full screen" data-tip="Full screen" disabled={!hasSong} className={cx(btn(false), 'disabled:opacity-40')} onClick={() => setFullscreen(true)}>
          <IconExpand size={16} />
        </button>
      </div>
    </footer>
  );
}

/** Mobile mini player: tinted with the artwork colour; tap to expand, swipe sideways to skip. */
export function MobileMiniPlayer() {
  const s = usePlayer((st) => st.current);
  const status = usePlayer((st) => st.status);
  const fullscreen = useUI((u) => u.fullscreen);
  const color = useArtColor(s?.img, s?.an || '');
  const x = useMotionValue(0);
  const op = useTransform(x, [-120, 0, 120], [0.4, 1, 0.4]);
  const live = useLiveTime();
  const bar = useRef<HTMLDivElement>(null);
  const duration = usePlayer((st) => st.duration);
  const playing = status === 'playing' || status === 'loading';

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const d = usePlayer.getState().duration;
      if (bar.current) bar.current.style.transform = `scaleX(${d ? Math.min(1, live() / d) : 0})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live, duration]);

  return (
    <AnimatePresence>
      {s && !fullscreen && (
        <motion.div
          key="mini"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="fixed inset-x-2 z-40 md:hidden"
          style={{ bottom: 'calc(var(--tabs-h) + 4px)' }}
        >
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            style={{ x, opacity: op, background: `linear-gradient(${color}, ${color}), #222` }}
            onDragEnd={(_, i) => {
              if (i.offset.x < -70 || i.velocity.x < -500) usePlayer.getState().next();
              else if (i.offset.x > 70 || i.velocity.x > 500) usePlayer.getState().prev();
              animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
            }}
            onTap={(e) => {
              if (!(e.target as HTMLElement).closest('button')) useUI.getState().setFullscreen(true);
            }}
            onContextMenu={(e) => openSongMenu(e, s)}
            className="relative flex h-14 items-center gap-2.5 overflow-hidden rounded-md pr-1 pl-2 shadow-[0_8px_24px_rgba(0,0,0,.5)]"
          >
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
              <Cover src={s.img} name={s.an} rounded="rounded" textSize="text-[6px]" />
            </div>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={s.id} className="relative min-w-0 flex-1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: 'spring', stiffness: 400, damping: 34 }}>
                <div className="truncate text-[13.5px] font-bold">{s.t}</div>
                <div className="truncate text-[12.5px] text-white/70">{artistOf(s)}</div>
              </motion.div>
            </AnimatePresence>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <LikeButton id={s.id} size={20} className="text-white/80" />
            </div>
            <motion.button
              type="button"
              aria-label={playing ? 'Pause' : 'Play'}
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                usePlayer.getState().toggle();
              }}
              className="relative grid h-10 w-10 place-items-center text-white"
            >
              <PlayGlyph playing={playing} size={24} />
            </motion.button>
            <div className="absolute inset-x-2 bottom-0 h-[2px] overflow-hidden rounded-full bg-white/25">
              <div ref={bar} className="h-full origin-left bg-white" style={{ transform: 'scaleX(0)' }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
