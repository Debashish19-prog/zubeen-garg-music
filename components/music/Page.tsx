'use client';
import { motion, useMotionValueEvent, useTransform } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { rgba } from '@/lib/text';
import { useMainScrollY } from '@/components/shell/MainScroll';
import { PlayButton } from '@/components/ui/PlayButton';
import { IconChevronLeft, IconMore, IconShuffle } from '@/components/ui/Icons';
import { usePlayer } from '@/store/player';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/**
 * Sticky bar at the top of the main panel. Transparent over the header; as you scroll it fills
 * with the page colour and the title + play button slide in.
 */
export function PageTop({ color, title, playing, onPlay, threshold = 260, back = true }: { color: string; title?: string; playing?: boolean; onPlay?: () => void; threshold?: number; back?: boolean }) {
  const router = useRouter();
  const scrollY = useMainScrollY();
  const bg = useTransform(scrollY, [threshold * 0.35, threshold * 0.8], [0, 1]);
  const [show, setShow] = useState(false);
  useMotionValueEvent(scrollY, 'change', (v) => setShow(v > threshold));
  return (
    <div className="sticky top-0 z-20 -mb-16 h-16">
      <motion.div className="absolute inset-0 shadow-[0_8px_20px_-12px_rgba(0,0,0,.6)]" style={{ opacity: bg, background: `linear-gradient(${color}, ${color}), #000` }}>
        <div className="absolute inset-0 bg-black/35" />
      </motion.div>
      <div className="relative flex h-full items-center gap-3 px-3 md:px-6">
        {back && (
          <button type="button" aria-label="Go back" onClick={() => router.back()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/40 text-white md:hidden">
            <IconChevronLeft size={20} />
          </button>
        )}
        <motion.div className="flex min-w-0 items-center gap-3" initial={false} animate={{ opacity: show ? 1 : 0, y: show ? 0 : 12 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} aria-hidden={!show}>
          {onPlay && <PlayButton size={44} playing={!!playing} onClick={onPlay} className="hidden md:grid" />}
          {title && <span className="truncate text-xl font-bold tracking-tight md:text-2xl">{title}</span>}
        </motion.div>
      </div>
    </div>
  );
}

const titleSize = (t: string) =>
  t.length <= 14 ? 'md:text-[clamp(48px,6.4vw,96px)]' : t.length <= 26 ? 'md:text-[clamp(40px,4.8vw,72px)]' : t.length <= 44 ? 'md:text-[clamp(32px,3.4vw,48px)]' : 'md:text-[32px]';

/** Gradient header: artwork, kind label, huge title, meta line. */
export function PageHeader({ color, cover, kind, title, meta, round, desc }: { color: string; cover: ReactNode; kind: string; title: string; meta?: ReactNode; round?: boolean; desc?: ReactNode }) {
  const scrollY = useMainScrollY();
  const coverScale = useTransform(scrollY, [0, 260], [1, 0.82]);
  const coverOpacity = useTransform(scrollY, [0, 260], [1, 0.35]);
  return (
    <header className="relative px-4 pt-16 pb-5 md:px-6 md:pb-6" style={{ background: `linear-gradient(${rgba(color, 1)}, ${rgba(color, 0.55)})` }}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/45" />
      <div className="relative flex flex-col items-center gap-5 md:flex-row md:items-end md:gap-6">
        <motion.div
          className={cx('w-[min(62vw,240px)] shrink-0 shadow-[0_8px_60px_rgba(0,0,0,.55)] md:w-[clamp(160px,18vw,232px)]', round ? 'rounded-full' : 'rounded-md')}
          style={{ scale: coverScale, opacity: coverOpacity }}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        >
          {cover}
        </motion.div>
        <motion.div className="w-full min-w-0 md:pb-1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 26, delay: 0.05 }}>
          <div className="hidden text-[13px] font-semibold md:block">{kind}</div>
          <h1 className={cx('mt-1 line-clamp-3 text-[26px] leading-[1.05] font-black tracking-[-0.02em] break-words md:mt-2 md:mb-3 md:leading-[0.98]', titleSize(title))}>{title}</h1>
          {desc && <div className="mt-2 line-clamp-2 text-[14px] text-white/70">{desc}</div>}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-x-1 text-[13px] text-white/80 md:text-[14px]">{meta}</div>}
          <div className="mt-1 text-[12px] font-semibold text-white/60 md:hidden">{kind}</div>
        </motion.div>
      </div>
    </header>
  );
}

/** The row under the header: big play, shuffle, more; plus anything page-specific on the right. */
export function ActionBar({ playing, onPlay, onShuffle, onMore, children, right, disabled }: { playing: boolean; onPlay: () => void; onShuffle?: () => void; onMore?: (e: React.MouseEvent) => void; children?: ReactNode; right?: ReactNode; disabled?: boolean }) {
  const shuffle = usePlayer((s) => s.shuffle);
  return (
    <div className="flex items-center gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      {!disabled && <PlayButton size={56} playing={playing} onClick={onPlay} />}
      {onShuffle && (
        <motion.button
          type="button"
          data-tip={shuffle ? 'Shuffle is on' : 'Shuffle play'}
          aria-label="Shuffle play"
          onClick={onShuffle}
          whileTap={{ scale: 0.9 }}
          className={cx('relative grid h-10 w-10 place-items-center transition-colors', shuffle ? 'text-accent' : 'text-sub hover:text-white')}
        >
          <IconShuffle size={30} />
          {shuffle && <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-accent" />}
        </motion.button>
      )}
      {children}
      {onMore && (
        <button type="button" aria-label="More options" data-tip="More options" onClick={onMore} className="grid h-10 w-10 place-items-center text-sub transition-colors hover:text-white">
          <IconMore size={30} />
        </button>
      )}
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}

/** Body below the header: a soft wash of the page colour fading into the panel. */
export function PageBody({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px]" style={{ background: `linear-gradient(${rgba(color, 0.42)}, transparent)` }} />
      <div className="relative pb-10">{children}</div>
    </div>
  );
}

export function Dot() {
  return <span className="px-0.5 text-white/60">•</span>;
}
