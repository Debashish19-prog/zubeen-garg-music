'use client';
import { albumHref, artistOf } from '@/lib/meta';
import Link from 'next/link';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePlayer, useShowsMedia } from '@/store/player';
import { useUI } from '@/store/ui';
import { useArtColor, useIsMobile } from '@/lib/client/hooks';
import { openSongMenu } from '@/lib/client/menus';
import { rgba } from '@/lib/text';
import { Cover } from '@/components/ui/Cover';
import { IconChevronDown, IconCollapse, IconExternal, IconMore, IconQueue } from '@/components/ui/Icons';
import { LikeButton, Progress, SourceBadge, TransportControls, VideoToggle, Volume } from './Controls';
import { MediaSlot } from './MediaSlot';
import { QueueView } from './RightPanel';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** A title that drifts sideways when it is too long to fit. */
function Marquee({ text, className }: { text: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    const b = box.current, i = inner.current;
    if (!b || !i) return;
    const over = i.scrollWidth - b.clientWidth;
    setShift(over > 4 ? over + 12 : 0);
  }, [text]);
  return (
    <div ref={box} className={cx('overflow-hidden', className)} style={shift ? { maskImage: 'linear-gradient(90deg,#000 88%,transparent)' } : undefined}>
      <span ref={inner} className={shift ? 'marquee' : 'inline-block whitespace-nowrap'} style={shift ? ({ '--marquee-x': `-${shift}px`, '--marquee-d': `${Math.max(6, shift / 18)}s` } as React.CSSProperties) : undefined}>
        {text}
      </span>
    </div>
  );
}

export default function FullscreenPlayer() {
  const open = useUI((u) => u.fullscreen);
  const setFullscreen = useUI((u) => u.setFullscreen);
  const s = usePlayer((st) => st.current);
  const source = usePlayer((st) => st.source);
  const ctx = usePlayer((st) => st.context);
  const mobile = useIsMobile();
  const color = useArtColor(s?.img, s?.an || '');
  const drag = useDragControls();
  const [queueOpen, setQueueOpen] = useState(false);
  const visual = useShowsMedia();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !useUI.getState().menu && setFullscreen(false);
    const onFs = () => !document.fullscreenElement && !mobile && setFullscreen(false);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, [open, mobile, setFullscreen]);

  useEffect(() => {
    if (!s && open) setFullscreen(false);
  }, [s, open, setFullscreen]);

  return (
    <AnimatePresence>
      {open && s && (
        <motion.div
          key="fs"
          role="dialog"
          aria-label="Now playing, full screen"
          className="fixed inset-0 z-[60] overflow-hidden bg-[#0a0a0a] text-white"
          initial={mobile ? { y: '100%' } : { opacity: 0 }}
          animate={mobile ? { y: 0 } : { opacity: 1 }}
          exit={mobile ? { y: '100%' } : { opacity: 0 }}
          transition={mobile ? { type: 'spring', stiffness: 300, damping: 34 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          drag={mobile ? 'y' : false}
          dragListener={false}
          dragControls={drag}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.75 }}
          onDragEnd={(_, i) => (i.offset.y > 140 || i.velocity.y > 700) && setFullscreen(false)}
        >
          {/* backdrop: blurred artwork + colour */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${rgba(color, 0.95)} 0%, ${rgba(color, 0.55)} 45%, #0a0a0a 100%)` }} />
          <AnimatePresence>
            <motion.div key={s.img || s.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 0.45 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
              {s.img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.img} alt="" className="h-full w-full scale-125 object-cover blur-[70px] saturate-150" style={{ animation: 'kenburns 30s ease-in-out infinite alternate' }} />
              )}
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/70" />

          <div className="relative flex h-full flex-col" style={{ paddingBottom: 'var(--safe-b)' }}>
            {/* top bar */}
            <div className="flex h-16 shrink-0 touch-none items-center gap-3 px-3 md:h-20 md:px-8" onPointerDown={(e) => mobile && drag.start(e)}>
              <button type="button" aria-label="Close" onClick={() => setFullscreen(false)} className="grid h-10 w-10 place-items-center rounded-full text-white/90 hover:bg-white/10 md:hidden">
                <IconChevronDown size={26} />
              </button>
              <div className="min-w-0 flex-1 text-center md:text-left">
                <div className="text-[11px] font-bold tracking-[0.14em] text-white/70 uppercase">Playing from {ctx?.kind || 'your queue'}</div>
                {ctx?.href ? (
                  <Link href={ctx.href} onClick={() => setFullscreen(false)} className="block truncate text-[14px] font-bold hover:underline">
                    {ctx.label}
                  </Link>
                ) : (
                  <div className="truncate text-[14px] font-bold">{ctx?.label || s.an}</div>
                )}
              </div>
              <button type="button" aria-label="More options" onClick={(e) => openSongMenu(e, s)} className="grid h-10 w-10 place-items-center rounded-full text-white/90 hover:bg-white/10 md:hidden">
                <IconMore size={22} />
              </button>
              <button type="button" aria-label="Exit full screen" data-tip="Exit full screen" data-tip-pos="bottom" onClick={() => setFullscreen(false)} className="hidden h-10 w-10 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white md:grid">
                <IconCollapse size={20} />
              </button>
            </div>

            {/* artwork / video + title */}
            <div className="flex min-h-0 flex-1 flex-col justify-center px-6 md:flex-row md:items-end md:justify-start md:gap-10 md:px-16 md:pb-6">
              <div className={cx('mx-auto w-full md:mx-0', visual ? 'max-w-[min(100%,960px)] md:w-[min(56vw,960px)]' : 'max-w-[min(100%,48vh)] md:w-[min(34vw,46vh)] md:max-w-none')} onPointerDown={(e) => mobile && !visual && drag.start(e)}>
                {visual && !queueOpen ? (
                  <MediaSlot name="full" priority={3} z={65} radius={10} wide />
                ) : visual ? (
                  <div className="aspect-video w-full rounded-lg bg-black/30" />
                ) : (
                  <motion.div layoutId={mobile ? undefined : 'np-cover'} transition={{ type: 'spring', stiffness: 220, damping: 28 }} className="overflow-hidden rounded-lg shadow-[0_24px_80px_rgba(0,0,0,.6)]">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.div key={s.id} initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                        <Cover src={s.img} name={s.an} sub={s.y ? String(s.y) : ''} rounded="rounded-lg" eager textSize="text-[clamp(18px,4vw,44px)]" />
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
              <div className="mt-6 flex min-w-0 items-end gap-3 md:mt-0 md:flex-1 md:pb-2">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div key={s.id} className="min-w-0 flex-1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
                    <div className="mb-2 hidden md:block">
                      <SourceBadge />
                    </div>
                    <Marquee text={s.t} className="text-[24px] leading-tight font-bold md:text-[clamp(36px,4.6vw,72px)] md:leading-[1.02] md:font-black md:tracking-tight" />
                    <div className="mt-1 truncate text-[16px] text-white/70 md:mt-3 md:text-[20px]">
                      {artistOf(s)}
                      <span className="hidden md:inline">
                        {' · '}
                        <Link href={albumHref(s)} onClick={() => setFullscreen(false)} className="hover:text-white hover:underline">
                          {s.an}
                        </Link>
                        {s.y ? ' · ' + s.y : ''}
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
                <LikeButton id={s.id} size={26} className="mb-1 text-white/80 md:hidden" />
              </div>
            </div>

            {/* controls */}
            <div className="shrink-0 px-6 pt-2 pb-6 md:px-16 md:pb-10">
              <Progress big />
              <div className="mt-3 md:mt-4 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="hidden items-center gap-2 md:flex">
                  <LikeButton id={s.id} size={22} />
                </div>
                <div className="mx-auto w-full max-w-[420px] md:w-[420px]">
                  <TransportControls big />
                </div>
                <div className="hidden items-center justify-end gap-2 md:flex">
                  <VideoToggle size={18} />
                  <Volume />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between md:hidden">
                <SourceBadge />
                <div className="flex items-center gap-1">
                  <VideoToggle size={22} big />
                  {s.L?.JioSaavn && (
                    <a href={s.L.JioSaavn} target="_blank" rel="noopener noreferrer" aria-label="Open on JioSaavn" className="grid h-10 w-10 place-items-center text-white/80">
                      <IconExternal size={20} />
                    </a>
                  )}
                  <button type="button" aria-label="Queue" onClick={() => setQueueOpen(true)} className="grid h-10 w-10 place-items-center text-white/80">
                    <IconQueue size={22} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* mobile queue sheet */}
          <AnimatePresence>
            {queueOpen && (
              <motion.div
                key="q"
                className="absolute inset-0 z-10 flex flex-col bg-[#121212]"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 36 }}
              >
                <div className="flex h-16 shrink-0 items-center px-3">
                  <button type="button" aria-label="Close queue" onClick={() => setQueueOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
                    <IconChevronDown size={26} />
                  </button>
                  <span className="flex-1 text-center text-[15px] font-bold">Queue</span>
                  <span className="w-10" />
                </div>
                {visual && (
                  <div className="shrink-0 px-4 pb-3">
                    <MediaSlot name="full-queue" priority={4} z={66} radius={8} className={source === 'sa' ? '!h-[260px]' : ''} />
                  </div>
                )}
                <QueueView />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
