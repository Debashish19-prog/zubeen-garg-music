'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useMediaSlot } from '@/lib/client/mediaSlots';
import { usePlayer, useShowsMedia } from '@/store/player';
import { useUI } from '@/store/ui';
import { useIsMobile } from '@/lib/client/hooks';
import { SRC_INFO } from '@/lib/meta';
import { IconExpand, IconNowPlaying } from '@/components/ui/Icons';
import { VideoToggle } from './Controls';
import type { SourceKey } from '@/lib/types';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Box sizes per source: YouTube 16:9, Spotify's 152px embed, JioSaavn's tall album widget. */
export function slotStyle(source: SourceKey | null, wide = false): React.CSSProperties {
  if (source === 'sp') return { height: 152 };
  if (source === 'sa') return { height: wide ? 420 : 380 };
  return { aspectRatio: '16 / 9' };
}

/** A placeholder the floating media stage glides into. */
export function MediaSlot({ name, priority, className, z = 30, radius = 8, wide }: { name: string; priority: number; className?: string; z?: number; radius?: number; wide?: boolean }) {
  const ref = useMediaSlot(name, priority);
  const source = usePlayer((s) => s.source);
  return <div ref={ref} data-z={z} data-radius={radius} className={cx('w-full rounded-lg bg-black/40', className)} style={slotStyle(source, wide)} />;
}

/**
 * Floating card that holds the video (or embed) when neither the Now Playing view nor the
 * fullscreen player is open. YouTube's player has to stay visible while it plays.
 */
export function MiniMediaCard() {
  const source = usePlayer((s) => s.source);
  const title = usePlayer((s) => s.current?.t);
  const panel = useUI((u) => u.panel);
  const fullscreen = useUI((u) => u.fullscreen);
  const mobile = useIsMobile();
  const media = useShowsMedia();
  const show = media && !fullscreen && (mobile || panel !== 'now');
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="mini-media"
          drag
          dragMomentum={false}
          dragElastic={0.1}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          className={cx('fixed z-40 overflow-hidden rounded-xl bg-[#181818] shadow-[0_16px_48px_rgba(0,0,0,.6)] ring-1 ring-white/10', mobile ? 'right-2 left-2' : 'right-4 w-[360px]')}
          style={{ bottom: mobile ? 'calc(var(--tabs-h) + 68px)' : 'calc(var(--bar-h) + 16px)' }}
        >
          <div className="flex h-9 cursor-grab items-center gap-2 pr-1 pl-3 active:cursor-grabbing">
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-sub">
              {source ? SRC_INFO[source].via : ''} · {title}
            </span>
            <VideoToggle size={15} tipPos="bottom" className="rounded-full hover:bg-white/10" />
            {!mobile && (
              <button type="button" aria-label="Open in Now Playing view" data-tip="Now playing view" onClick={() => useUI.getState().setPanel('now')} className="grid h-7 w-7 place-items-center rounded-full text-sub hover:bg-white/10 hover:text-white">
                <IconNowPlaying size={15} />
              </button>
            )}
            <button type="button" aria-label="Full screen" data-tip="Full screen" onClick={() => useUI.getState().setFullscreen(true)} className="grid h-7 w-7 place-items-center rounded-full text-sub hover:bg-white/10 hover:text-white">
              <IconExpand size={15} />
            </button>
          </div>
          <MediaSlot name="mini" priority={1} z={41} radius={0} className={cx('rounded-none', mobile && source === 'sa' && '!h-[300px]')} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
