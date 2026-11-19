'use client';
import { useState } from 'react';
import { hash, hashColor } from '@/lib/text';
import { IconHeart, IconNote, IconUpload } from './Icons';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const FALLBACKS = [
  { bg: 'linear-gradient(160deg,#efe8d8,#d9cfb8)', fg: '#2a1a16', band: 'weave' },
  { bg: 'linear-gradient(160deg,#e0ad4c,#b9832a)', fg: '#3a220c', band: 'weave' },
  { bg: 'linear-gradient(160deg,#b52a2a,#7d1717)', fg: '#fff4e6', band: 'weave-cot' },
  { bg: 'linear-gradient(160deg,#2b4245,#16262a)', fg: '#efe8d8', band: 'weave' },
];

/** YouTube's hqdefault/sddefault thumbnails are 4:3 with black bars around a 16:9 frame; zoom 4/3 to hide them. */
const ytLetterbox = (src: string) => /i\.ytimg\.com\/vi\/[^/]+\/(hq|sd)default\.jpg/.test(src);

/** Album / song artwork, with a woven gamosa-style fallback when there is none (or it fails to load). */
export function Cover({
  src,
  name,
  sub,
  className,
  rounded = 'rounded-md',
  eager,
  textSize = 'text-[clamp(10px,1em,17px)]',
}: {
  src?: string;
  name: string;
  sub?: string;
  className?: string;
  rounded?: string;
  eager?: boolean;
  textSize?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const f = FALLBACKS[hash(name) % FALLBACKS.length];
  const showImg = src && !failed;
  return (
    <div className={cx('relative aspect-square overflow-hidden', rounded, className)} style={{ background: showImg && loaded ? '#282828' : f.bg }}>
      {(!showImg || !loaded) && (
        <div className="absolute inset-0 flex flex-col justify-between p-[10%] pb-0" style={{ color: f.fg }}>
          <span className={cx('line-clamp-4 font-extrabold leading-[1.05] tracking-tight break-words', textSize)}>
            {name}
            {sub ? <small className="mt-1 block text-[0.7em] font-semibold opacity-70">{sub}</small> : null}
          </span>
          <i className={cx('-mx-[12%] block h-[15%]', f.band)} />
        </div>
      )}
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          ref={(el) => {
            // server-rendered images can finish loading before React hydrates and never fire onLoad
            if (el?.complete && el.naturalWidth > 0 && !loaded) setLoaded(true);
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cx('absolute inset-0 h-full w-full object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0', ytLetterbox(src) && 'scale-[1.34]')}
        />
      )}
    </div>
  );
}

/** Photo cover for curated collections and mixes: a photo, a tinted foot with the name, and the weave. */
export function PhotoCover({ src, name, color, className, rounded = 'rounded-md', mix, compact }: { src: string; name: string; color: string; className?: string; rounded?: string; mix?: boolean; compact?: boolean }) {
  return (
    <div className={cx('relative aspect-square overflow-hidden bg-[#282828]', rounded, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover object-top" />
      {!compact && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-[58%]" style={{ background: `linear-gradient(to top, ${color} 22%, transparent)` }} />
          <div className="absolute inset-x-[8%] bottom-[12%] text-left">
            {mix && <div className="mb-0.5 text-[clamp(8px,0.62em,11px)] font-bold uppercase tracking-[0.18em] text-white/80">Zubeen</div>}
            <div className="text-[clamp(11px,1.15em,22px)] leading-[1.02] font-black tracking-tight text-white drop-shadow">{name}</div>
          </div>
          <i className="weave absolute inset-x-0 bottom-0 block h-[6%]" />
        </>
      )}
      {compact && <i className="weave absolute inset-x-0 bottom-0 block h-[10%]" />}
    </div>
  );
}

export function LikedCover({ className, rounded = 'rounded-md', iconSize = 0.36 }: { className?: string; rounded?: string; iconSize?: number }) {
  return (
    <div className={cx('relative grid aspect-square place-items-center overflow-hidden', rounded, className)} style={{ background: 'linear-gradient(135deg,#7a1414 0%,#e23d3d 55%,#f2c48c 100%)' }}>
      <IconHeart className="text-white drop-shadow" style={{ width: `${iconSize * 100}%`, height: `${iconSize * 100}%` }} />
      <i className="weave absolute inset-x-0 bottom-0 block h-[7%] opacity-80" />
    </div>
  );
}

/** Cover of the Uploads playlist: muga gold into deep teal, with the upload arrow. */
export function UploadsCover({ className, rounded = 'rounded-md', iconSize = 0.36 }: { className?: string; rounded?: string; iconSize?: number }) {
  return (
    <div className={cx('relative grid aspect-square place-items-center overflow-hidden', rounded, className)} style={{ background: 'linear-gradient(135deg,#123c3f 0%,#2b6f63 45%,#e0ad4c 100%)' }}>
      <IconUpload className="text-white drop-shadow" style={{ width: `${iconSize * 100}%`, height: `${iconSize * 100}%` }} />
      <i className="weave absolute inset-x-0 bottom-0 block h-[7%] opacity-80" />
    </div>
  );
}

/** Playlist cover: a 2x2 mosaic of the first four distinct artworks, or a note on grey. */
export function MosaicCover({ imgs, name, className, rounded = 'rounded-md' }: { imgs: string[]; name: string; className?: string; rounded?: string }) {
  const u = [...new Set(imgs.filter(Boolean))];
  if (u.length >= 4)
    return (
      <div className={cx('grid aspect-square grid-cols-2 overflow-hidden bg-[#282828]', rounded, className)}>
        {u.slice(0, 4).map((s, k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={k} src={s} alt="" loading="lazy" className={cx('h-full w-full object-cover', ytLetterbox(s) && 'scale-[1.34]')} />
        ))}
      </div>
    );
  if (u.length) return <Cover src={u[0]} name={name} className={className} rounded={rounded} />;
  return (
    <div className={cx('grid aspect-square place-items-center bg-[#282828] text-[#7f7f7f] shadow-inner', rounded, className)}>
      <IconNote className="h-[38%] w-[38%]" />
    </div>
  );
}

/** Round avatar with initials for co-singers and composers (no photos in the catalogue). */
export function PersonAvatar({ name, className, src }: { name: string; className?: string; src?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const c = hashColor(name);
  if (src)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={cx('aspect-square rounded-full object-cover object-top', className)} />
    );
  return (
    <div className={cx('grid aspect-square place-items-center rounded-full font-black text-white/90', className)} style={{ background: `radial-gradient(circle at 30% 25%, ${c}, #121212 120%)` }}>
      <span className="text-[clamp(14px,2.4em,64px)] tracking-tight">{initials}</span>
    </div>
  );
}
