'use client';
import Link from 'next/link';
import { motion, type Variants } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ListType, PlayContext } from '@/lib/types';
import { fetchListIds } from '@/lib/client/api';
import { openListMenuLazy, playContext } from '@/lib/client/menus';
import { useContextState } from '@/lib/client/hooks';
import { usePlayer } from '@/store/player';
import { PlayButton } from '@/components/ui/PlayButton';
import { IconChevronLeft, IconChevronRight } from '@/components/ui/Icons';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export interface PlaySpec {
  ctx: PlayContext;
  ids?: number[];
  type?: ListType;
  key?: string;
  /** start playing at this index of `ids` (song cards in a shelf) */
  start?: number;
}
const idsOf = async (p: PlaySpec) => p.ids ?? (p.type ? await fetchListIds(p.type, p.key ?? '') : []);

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
};
export const staggerVariants: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.035 } } };

function HoverPlay({ play, className }: { play: PlaySpec; className?: string }) {
  const { playing } = useContextState(play.ctx.key);
  const [busy, setBusy] = useState(false);
  return (
    <div className={cx('absolute right-2 bottom-2 transition-all duration-300 ease-[var(--ease-out-quint)]', playing ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100', className)}>
      <PlayButton
        size={48}
        playing={playing}
        loading={busy}
        label={playing ? `Pause ${play.ctx.label}` : `Play ${play.ctx.label}`}
        onClick={async () => {
          setBusy(true);
          try {
            playContext(await idsOf(play), play.ctx, play.start ?? 0);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

/** Spotify-style card: artwork, title, subtitle; the play button rises on hover. */
export function Card({ href, title, sub, cover, round, play, className, fixed = true }: { href: string; title: string; sub?: ReactNode; cover: ReactNode; round?: boolean; play?: PlaySpec; className?: string; fixed?: boolean }) {
  const { isCtx } = useContextState(play?.ctx.key ?? '__none');
  return (
    <motion.div variants={cardVariants} className={cx('group relative shrink-0 snap-start', fixed && 'w-[148px] sm:w-[168px] xl:w-[184px]', className)}>
      <Link
        href={href}
        className="block rounded-lg p-2 transition-colors duration-300 hover:bg-[#1f1f1f] focus-visible:bg-[#1f1f1f] active:bg-black sm:p-3"
        onContextMenu={play ? (e) => openListMenuLazy(e, () => idsOf(play), play.ctx) : undefined}
      >
        <div className={cx('relative shadow-[0_8px_24px_rgba(0,0,0,.5)]', round ? 'rounded-full' : 'rounded-md')}>
          {cover}
          {play && <HoverPlay play={play} />}
        </div>
        <div className={cx('mt-2.5 min-w-0', round && 'text-center')}>
          <div className={cx('truncate text-[15px] font-bold', isCtx ? 'text-accent' : 'text-white')}>{title}</div>
          {sub && <div className="mt-1 line-clamp-2 text-[13.5px] leading-snug text-sub">{sub}</div>}
        </div>
      </Link>
    </motion.div>
  );
}

/** A horizontal row of cards with a title, "Show all" and arrow buttons. */
export function Shelf({ title, href, children, sub }: { title: string; href?: string; children: ReactNode; sub?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ l: false, r: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const upd = () => setEdges({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    upd();
    el.addEventListener('scroll', upd, { passive: true });
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', upd);
      ro.disconnect();
    };
  }, []);
  const by = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="group/shelf relative mt-6 md:mt-8">
      <div className="mb-1 flex items-end justify-between gap-4 px-4 md:px-6">
        <div className="min-w-0">
          {sub && <div className="text-[13px] font-medium text-sub">{sub}</div>}
          <h2 className="truncate text-[22px] font-bold tracking-tight md:text-2xl">{href ? <Link href={href} className="hover:underline">{title}</Link> : title}</h2>
        </div>
        {href && (
          <Link href={href} className="shrink-0 pb-1 text-[13px] font-bold text-sub hover:text-white hover:underline">
            Show all
          </Link>
        )}
      </div>
      <div className="relative">
        <motion.div
          ref={ref}
          className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 overflow-x-auto px-2 md:scroll-px-6 md:px-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '0px 0px -40px 0px' }}
          variants={staggerVariants}
        >
          {children}
          <div className="w-2 shrink-0 md:w-4" />
        </motion.div>
        {(['l', 'r'] as const).map((side) => (
          <button
            key={side}
            type="button"
            aria-label={side === 'l' ? 'Scroll left' : 'Scroll right'}
            onClick={() => by(side === 'l' ? -1 : 1)}
            className={cx(
              'absolute top-[38%] z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-[#1f1f1f]/95 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-[#2a2a2a] md:grid',
              side === 'l' ? 'left-3' : 'right-3',
              edges[side] ? 'opacity-0 group-hover/shelf:opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            {side === 'l' ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
          </button>
        ))}
      </div>
    </section>
  );
}

/** Spotify Browse tile: a colour block, the label, and artwork or a glyph tilted into the corner. */
export function BrowseTile({ href, title, color, img, glyph, sub }: { href: string; title: string; color: string; img?: string; glyph?: string; sub?: string }) {
  return (
    <motion.div variants={cardVariants}>
      <Link href={href} className="group relative block aspect-[16/10] overflow-hidden rounded-lg p-3 sm:p-4" style={{ background: color }}>
        <div className="relative z-10 max-w-[70%] text-[19px] leading-tight font-extrabold tracking-tight break-words sm:text-[22px]">{title}</div>
        {sub && <div className="relative z-10 mt-1 text-[12.5px] font-semibold text-white/80">{sub}</div>}
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" loading="lazy" className="absolute -right-[6%] -bottom-[6%] w-[46%] rotate-[25deg] rounded shadow-[0_4px_20px_rgba(0,0,0,.4)] transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:rotate-[18deg] group-hover:scale-110" />
        )}
        {glyph && (
          <span lang="mul" className="font-bangla absolute -right-[4%] -bottom-[14%] rotate-[-14deg] text-[clamp(44px,9vw,76px)] leading-none font-black text-black/25 transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:-translate-y-1 group-hover:rotate-[-8deg] group-hover:scale-110">
            {glyph}
          </span>
        )}
      </Link>
    </motion.div>
  );
}

/** Home "quick picks": compact horizontal tile; hovering tints the page header (like Spotify). */
export function QuickTile({ href, title, cover, play, onHover }: { href: string; title: string; cover: ReactNode; play: PlaySpec; onHover?: (on: boolean) => void }) {
  const { playing, isCtx } = useContextState(play.ctx.key);
  return (
    <motion.div variants={cardVariants} className="group relative" onMouseEnter={() => onHover?.(true)} onMouseLeave={() => onHover?.(false)}>
      <Link href={href} className={cx('flex h-12 items-center gap-2 overflow-hidden rounded bg-white/[.07] pr-2 transition-[background-color,padding] duration-300 hover:bg-white/[.16] sm:h-16 sm:gap-3 sm:rounded-md sm:group-hover:pr-14', playing && 'sm:pr-14')}>
        <div className="h-full w-12 shrink-0 shadow-[0_8px_24px_rgba(0,0,0,.5)] sm:w-16 [&>*]:h-full [&>*]:w-full [&>*]:rounded-none">{cover}</div>
        <span className={cx('line-clamp-2 min-w-0 flex-1 text-[12.5px] leading-tight font-bold sm:text-[15px]', isCtx && 'text-accent')}>{title}</span>
      </Link>
      <div className={cx('absolute top-1/2 right-2 hidden -translate-y-1/2 transition-all duration-300 sm:block', playing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        <PlayButton size={36} playing={playing} onClick={async () => playContext(await idsOf(play), play.ctx)} />
      </div>
    </motion.div>
  );
}

export function Grid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={cx('grid grid-cols-2 gap-x-1 gap-y-2 px-2 xs:grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] md:px-4', className)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -20px 0px' }}
      variants={staggerVariants}
    >
      {children}
    </motion.div>
  );
}

export function usePlayingKey() {
  return usePlayer((s) => s.context?.key);
}
