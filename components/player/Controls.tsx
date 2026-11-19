'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback } from 'react';
import { mmss } from '@/lib/text';
import { SRC_INFO } from '@/lib/meta';
import { usePlayer, toggleVideo } from '@/store/player';
import { useUI } from '@/store/ui';
import { useLibrary } from '@/store/library';
import { Slider } from '@/components/ui/Slider';
import { PlayGlyph } from '@/components/ui/PlayButton';
import { IconHeart, IconHeartOutline, IconNext, IconPrev, IconRepeat, IconRepeatOne, IconShuffle, IconVideo, IconVideoOff, IconVolume, IconVolumeLow, IconVolumeOff } from '@/components/ui/Icons';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Current position, interpolated between the players' (coarse) time updates. */
export function useLiveTime() {
  return useCallback(() => {
    const s = usePlayer.getState();
    if (s.status !== 'playing') return s.time;
    return Math.min(s.duration || Infinity, s.time + (performance.now() - s.stamp) / 1000);
  }, []);
}

function Toggle({ on, label, onClick, children, size = 32, dot = true }: { on?: boolean; label: string; onClick: () => void; children: React.ReactNode; size?: number; dot?: boolean }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={on}
      data-tip={label}
      whileTap={{ scale: 0.86 }}
      onClick={onClick}
      className={cx('relative grid place-items-center transition-colors', on ? 'text-accent hover:text-accent-hi' : 'text-sub hover:text-white')}
      style={{ width: size, height: size }}
    >
      {children}
      {dot && on && <motion.span layoutId={undefined} initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-accent" />}
    </motion.button>
  );
}

export function TransportControls({ big }: { big?: boolean }) {
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const status = usePlayer((s) => s.status);
  const hasSong = usePlayer((s) => !!s.current);
  const playing = status === 'playing' || status === 'loading';
  const icon = big ? 30 : 18;
  return (
    <div className={cx('flex items-center', big ? 'justify-between gap-2' : 'gap-4')}>
      <Toggle on={shuffle} label={shuffle ? 'Disable shuffle' : 'Enable shuffle'} onClick={() => usePlayer.getState().setShuffle(!shuffle)} size={big ? 48 : 32}>
        <IconShuffle size={big ? 26 : 16} />
      </Toggle>
      <motion.button type="button" aria-label="Previous" data-tip="Previous" whileTap={{ scale: 0.86 }} disabled={!hasSong} onClick={() => usePlayer.getState().prev()} className="grid place-items-center text-sub transition-colors hover:text-white disabled:opacity-40" style={{ width: big ? 56 : 32, height: big ? 56 : 32 }}>
        <IconPrev size={icon} />
      </motion.button>
      <motion.button
        type="button"
        aria-label={playing ? 'Pause' : 'Play'}
        data-tip={playing ? 'Pause' : 'Play'}
        disabled={!hasSong}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => usePlayer.getState().toggle()}
        className={cx('relative grid place-items-center rounded-full bg-white text-black disabled:opacity-50', big ? 'h-[68px] w-[68px]' : 'h-8 w-8')}
      >
        <PlayGlyph playing={playing} size={big ? 30 : 16} />
        {status === 'loading' && <span className="absolute -inset-1 animate-spin rounded-full border-2 border-transparent border-t-white/80" />}
      </motion.button>
      <motion.button type="button" aria-label="Next" data-tip="Next" whileTap={{ scale: 0.86 }} disabled={!hasSong} onClick={() => usePlayer.getState().next()} className="grid place-items-center text-sub transition-colors hover:text-white disabled:opacity-40" style={{ width: big ? 56 : 32, height: big ? 56 : 32 }}>
        <IconNext size={icon} />
      </motion.button>
      <Toggle on={repeat > 0} label={['Enable repeat', 'Enable repeat one', 'Disable repeat'][repeat]} onClick={() => usePlayer.getState().cycleRepeat()} size={big ? 48 : 32}>
        {repeat === 2 ? <IconRepeatOne size={big ? 26 : 16} /> : <IconRepeat size={big ? 26 : 16} />}
      </Toggle>
    </div>
  );
}

export function Progress({ className, big }: { className?: string; big?: boolean }) {
  const time = usePlayer((s) => s.time);
  const duration = usePlayer((s) => s.duration);
  const source = usePlayer((s) => s.source);
  const hasSong = usePlayer((s) => !!s.current);
  const live = useLiveTime();
  const ext = source === 'sa';
  return (
    <div className={cx('flex w-full items-center gap-2 text-[12px] text-sub tabular', big && 'flex-wrap gap-y-1', className)}>
      <span className={cx('text-right', big ? 'order-2 w-auto' : 'w-10')}>{ext ? '' : mmss(time)}</span>
      <div className={cx('min-w-0 flex-1', big && 'order-1 basis-full')}>
        {ext ? (
          <div className="flex h-4 items-center">
            <div className="weave h-1 w-full rounded-full opacity-60" title="Playing inside the JioSaavn album player" />
          </div>
        ) : (
          <Slider
            label="Seek"
            value={time}
            getValue={live}
            max={duration || 0}
            disabled={!hasSong || !source || !duration}
            valueText={`${mmss(time)} of ${mmss(duration)}`}
            onCommit={(v) => usePlayer.getState().seek(v)}
            step={5}
            thick={big}
          />
        )}
      </div>
      <span className={cx(big ? 'order-3 ml-auto' : 'w-10')}>{ext ? <span className="whitespace-nowrap text-[#7fc3b0]">JioSaavn</span> : mmss(duration)}</span>
    </div>
  );
}

export function LikeButton({ id, size = 18, className }: { id: number; size?: number; className?: string }) {
  const liked = useLibrary((s) => s.liked.has(id));
  return (
    <motion.button
      type="button"
      aria-label={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
      data-tip={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
      aria-pressed={liked}
      onClick={(e) => {
        e.stopPropagation();
        useLibrary.getState().toggleLike(id);
      }}
      whileTap={{ scale: 0.8 }}
      className={cx('relative grid shrink-0 place-items-center transition-colors', liked ? 'text-accent' : 'text-sub hover:text-white', className)}
      style={{ width: size + 14, height: size + 14 }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={liked ? 'on' : 'off'}
          initial={{ scale: liked ? 0.3 : 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={liked ? { type: 'spring', stiffness: 600, damping: 12 } : { duration: 0.15 }}
          className="grid place-items-center"
        >
          {liked ? <IconHeart size={size} /> : <IconHeartOutline size={size} />}
        </motion.span>
      </AnimatePresence>
      <AnimatePresence>
        {liked && (
          <motion.span key="burst" className="pointer-events-none absolute inset-0 rounded-full border-2 border-accent" initial={{ scale: 0.4, opacity: 0.9 }} animate={{ scale: 1.6, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }} />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function Volume() {
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const source = usePlayer((s) => s.source);
  const v = muted ? 0 : volume;
  const Icon = v === 0 ? IconVolumeOff : v < 0.5 ? IconVolumeLow : IconVolume;
  const fixed = source === 'sp' || source === 'sa';
  return (
    <div className="flex items-center gap-1" title={fixed ? 'Use the volume inside the embedded player for this source' : undefined}>
      <button type="button" aria-label={v === 0 ? 'Unmute' : 'Mute'} data-tip={v === 0 ? 'Unmute' : 'Mute'} onClick={() => usePlayer.getState().toggleMute()} className="grid h-8 w-8 place-items-center text-sub hover:text-white">
        <Icon size={18} />
      </button>
      <Slider label="Volume" value={v} max={1} step={0.05} onChange={(x) => usePlayer.getState().setVolume(x)} onCommit={(x) => usePlayer.getState().setVolume(x)} className="w-24" valueText={`${Math.round(v * 100)}%`} />
    </div>
  );
}

export function SourceBadge({ className }: { className?: string }) {
  const source = usePlayer((s) => s.source);
  if (!source) return null;
  const info = SRC_INFO[source];
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase', source === 'tg' ? 'bg-accent/15 text-accent-hi' : source === 'yt' ? 'bg-muga/15 text-muga' : source === 'pv' ? 'bg-white/10 text-sub' : source === 'sp' ? 'bg-[#7fd08a]/15 text-[#7fd08a]' : 'bg-[#7fc3b0]/15 text-[#7fc3b0]', className)} title={info.long}>
      {info.short === info.via ? info.short : `${info.short} · ${info.via}`}
    </span>
  );
}

/**
 * "Hide video" / "Show video" for YouTube songs. Hiding keeps the song playing as audio only.
 * `pill` renders a labelled chip (Now Playing panel); otherwise an icon button.
 */
export function VideoToggle({ size = 16, pill, big, className, tipPos }: { size?: number; pill?: boolean; big?: boolean; className?: string; tipPos?: 'top' | 'bottom' }) {
  const source = usePlayer((s) => s.source);
  const hidden = useUI((u) => u.hideVideo);
  if (source !== 'yt') return null;
  const label = hidden ? 'Show video' : 'Hide video';
  const Icon = hidden ? IconVideo : IconVideoOff;
  if (pill)
    return (
      <button type="button" onClick={toggleVideo} aria-pressed={hidden} className={cx('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors', hidden ? 'bg-accent/15 text-accent-hi hover:bg-accent/25' : 'bg-white/[.08] text-white hover:bg-white/[.14]', className)}>
        <Icon size={15} />
        {hidden ? 'Show video' : 'Listen only'}
      </button>
    );
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={hidden}
      data-tip={label + ' (V)'}
      data-tip-pos={tipPos}
      onClick={toggleVideo}
      className={cx('relative grid place-items-center transition-colors', big ? 'h-10 w-10' : 'h-8 w-8', hidden ? 'text-accent' : 'text-sub hover:text-white', className)}
    >
      <Icon size={size} />
      {hidden && <span className="absolute bottom-0 h-1 w-1 rounded-full bg-accent" />}
    </button>
  );
}
