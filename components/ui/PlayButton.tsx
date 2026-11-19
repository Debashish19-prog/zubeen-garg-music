'use client';
import { AnimatePresence, motion } from 'motion/react';
import { IconPause, IconPlay } from './Icons';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Play/pause glyph that morphs between states. */
export function PlayGlyph({ playing, size }: { playing: boolean; size: number }) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        key={playing ? 'pause' : 'play'}
        initial={{ scale: 0.4, opacity: 0, rotate: playing ? -45 : 45 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.4, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 520, damping: 30 }}
        className="grid place-items-center"
      >
        {playing ? <IconPause size={size} /> : <IconPlay size={size} />}
      </motion.span>
    </AnimatePresence>
  );
}

/** The big round accent button (page action bars, card hover, fullscreen player). */
export function PlayButton({
  playing,
  onClick,
  size = 56,
  label,
  className,
  variant = 'accent',
  loading,
}: {
  playing: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: number;
  label?: string;
  className?: string;
  variant?: 'accent' | 'white';
  loading?: boolean;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label ?? (playing ? 'Pause' : 'Play')}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26 }}
      className={cx(
        'relative grid shrink-0 place-items-center rounded-full shadow-[0_8px_24px_rgba(0,0,0,.35)]',
        variant === 'accent' ? 'bg-accent text-cream hover:bg-accent-hi' : 'bg-white text-black',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <PlayGlyph playing={playing} size={Math.round(size * 0.42)} />
      {loading && <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-current opacity-60" />}
    </motion.button>
  );
}

export function Equalizer({ paused, className }: { paused?: boolean; className?: string }) {
  return (
    <span className={cx('eq', paused && 'paused', className)} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
