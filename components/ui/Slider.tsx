'use client';
import { useEffect, useRef, useState } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/**
 * Spotify-style slider: thin track, fill turns accent on hover, knob appears on hover/drag.
 * `getValue` lets the progress bar animate every frame without React re-renders.
 */
export function Slider({
  value,
  getValue,
  max,
  onChange,
  onCommit,
  label,
  valueText,
  disabled,
  className,
  thick,
  step,
}: {
  value: number;
  getValue?: () => number;
  max: number;
  onChange?: (v: number) => void;
  onCommit?: (v: number) => void;
  label: string;
  valueText?: string;
  disabled?: boolean;
  className?: string;
  thick?: boolean;
  step?: number;
}) {
  const track = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);
  dragRef.current = drag;

  // continuous redraw (smooth progress between player time updates)
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const v = dragRef.current ?? (getValue ? getValue() : value);
      const pct = max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0;
      if (fill.current) fill.current.style.transform = `scaleX(${pct / 100})`;
      if (knob.current) knob.current.style.left = pct + '%';
      if (getValue) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [getValue, value, max, drag]);

  const at = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * max;
  };

  return (
    <div
      ref={track}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(drag ?? value)}
      aria-valuetext={valueText}
      aria-disabled={disabled}
      className={cx('group relative flex h-4 touch-none items-center', disabled ? 'opacity-50' : 'cursor-pointer', className)}
      onPointerDown={(e) => {
        if (disabled || max <= 0) return;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        const v = at(e.clientX);
        setDrag(v);
        onChange?.(v);
      }}
      onPointerMove={(e) => {
        if (dragRef.current == null) return;
        const v = at(e.clientX);
        setDrag(v);
        onChange?.(v);
      }}
      onPointerUp={(e) => {
        if (dragRef.current == null) return;
        const v = at(e.clientX);
        setDrag(null);
        onCommit?.(v);
      }}
      onPointerCancel={() => setDrag(null)}
      onKeyDown={(e) => {
        if (disabled) return;
        const s = step ?? max / 20;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          onCommit?.(Math.min(max, value + s));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          onCommit?.(Math.max(0, value - s));
        }
      }}
    >
      <div className={cx('relative w-full overflow-hidden rounded-full bg-white/25', thick ? 'h-1.5' : 'h-1')}>
        <div ref={fill} className={cx('absolute inset-0 origin-left rounded-full bg-white transition-colors', drag != null ? 'bg-accent' : 'group-hover:bg-accent')} style={{ transform: 'scaleX(0)' }} />
      </div>
      <div
        ref={knob}
        className={cx('pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md transition-[opacity,transform] duration-150', drag != null ? 'scale-110 opacity-100' : 'scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:opacity-100')}
      />
    </div>
  );
}
