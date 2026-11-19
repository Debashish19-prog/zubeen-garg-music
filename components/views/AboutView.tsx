'use client';
import Link from 'next/link';
import { AnimatePresence, motion, useTransform } from 'motion/react';
import { useEffect, useState } from 'react';
import { ARTIST, PHOTOS, photo } from '@/lib/meta';
import { TIMELINE, TRIBUTE, TRIBUTE_LEAD } from '@/lib/tribute';
import { fmt } from '@/lib/text';
import { useMainScrollY } from '@/components/shell/MainScroll';
import { useShellData } from '@/components/shell/ShellData';
import { IconClose, IconChevronLeft, IconChevronRight } from '@/components/ui/Icons';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
const reveal = { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '0px 0px -60px 0px' }, transition: { type: 'spring' as const, stiffness: 120, damping: 22 } };

export interface AboutStats {
  wiki: number;
  saavn: number;
  apple: number;
  mb: number;
  yt: number;
  credits: number;
}

/** Words light up one after another as the paragraph scrolls into view. */
function WordReveal({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ');
  return (
    <motion.p className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: '0px 0px -80px 0px' }} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035 } } }}>
      {words.map((w, k) => (
        <motion.span key={k} className="inline-block" variants={{ hidden: { opacity: 0.15, y: 6, filter: 'blur(4px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5 } } }}>
          {w}&nbsp;
        </motion.span>
      ))}
    </motion.p>
  );
}

function Lightbox({ index, setIndex }: { index: number | null; setIndex: (i: number | null) => void }) {
  useEffect(() => {
    if (index == null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIndex(null);
      if (e.key === 'ArrowRight') setIndex((index + 1) % PHOTOS.length);
      if (e.key === 'ArrowLeft') setIndex((index - 1 + PHOTOS.length) % PHOTOS.length);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [index, setIndex]);
  const p = index != null ? PHOTOS[index] : null;
  return (
    <AnimatePresence>
      {p && index != null && (
        <motion.div key="lb" className="fixed inset-0 z-[85] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIndex(null)}>
          <motion.figure className="relative max-h-full max-w-[min(1100px,100%)]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img layoutId={'photo-' + p.id} src={p.src} alt={p.caption} className="max-h-[80dvh] w-auto rounded-lg object-contain shadow-2xl" transition={{ type: 'spring', stiffness: 260, damping: 30 }} />
            <figcaption className="mt-3 flex items-center justify-between gap-4 text-[14px] text-white/80">
              <span>{p.caption}</span>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-sub hover:text-white hover:underline">
                Source: {p.credit}
              </a>
            </figcaption>
          </motion.figure>
          {(['l', 'r'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-label={s === 'l' ? 'Previous photo' : 'Next photo'}
              onClick={(e) => {
                e.stopPropagation();
                setIndex(s === 'l' ? (index - 1 + PHOTOS.length) % PHOTOS.length : (index + 1) % PHOTOS.length);
              }}
              className={cx('absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20', s === 'l' ? 'left-3' : 'right-3')}
            >
              {s === 'l' ? <IconChevronLeft size={22} /> : <IconChevronRight size={22} />}
            </button>
          ))}
          <button type="button" aria-label="Close" onClick={() => setIndex(null)} className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
            <IconClose size={20} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AboutView({ stats }: { stats: AboutStats }) {
  const nav = useShellData();
  const y = useMainScrollY();
  const heroY = useTransform(y, [0, 600], [0, 180]);
  const heroScale = useTransform(y, [0, 600], [1.05, 1.18]);
  const [lb, setLb] = useState<number | null>(null);

  return (
    <div>
      {/* hero */}
      <section className="relative h-[min(620px,78vh)] min-h-[420px] overflow-hidden md:rounded-t-lg">
        <motion.div className="absolute inset-0" style={{ y: heroY, scale: heroScale }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo('avatar')} alt="Zubeen Garg smiling on stage" className="h-full w-full object-cover object-[50%_22%]" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-black/40 to-black/20" />
        <i className="weave absolute inset-x-0 top-0 block h-2.5" />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-8 md:px-10 md:pb-12">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 20 }}>
            <div className="text-[13px] font-bold tracking-[0.2em] text-white/80 uppercase">Who was</div>
            <h1 className="mt-1 text-[clamp(52px,10vw,128px)] leading-[0.9] font-black tracking-[-0.04em]">{ARTIST.name}</h1>
            <div className="font-bangla mt-3 text-[clamp(22px,3vw,34px)] font-bold text-white/90" lang="as">
              {ARTIST.native} <span className="font-sans text-[0.6em] font-semibold text-white/70">· 18 November 1972 – 19 September 2025</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* lead */}
      <section className="px-5 pt-8 pb-4 md:px-10 md:pt-12">
        <WordReveal text={TRIBUTE_LEAD} className="max-w-[30ch] text-[clamp(26px,3.6vw,46px)] leading-[1.15] font-extrabold tracking-tight" />
      </section>

      {/* numbers */}
      <motion.section className="grid grid-cols-2 gap-3 px-5 py-6 sm:grid-cols-4 md:px-10" initial="hidden" whileInView="show" viewport={{ once: true }} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}>
        {[
          ['38,000+', 'songs recorded, by most accounts'],
          ['40+', 'languages and dialects'],
          [fmt(nav.songs), 'songs in this catalogue'],
          ['33', 'years of music, 1992–2025'],
        ].map(([n, l]) => (
          <motion.div key={l} variants={{ hidden: { opacity: 0, y: 20, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1 } }} className="rounded-xl bg-white/[.05] p-4 ring-1 ring-white/5 md:p-5">
            <div className="text-[clamp(28px,3.4vw,44px)] leading-none font-black tracking-tight text-accent">{n}</div>
            <div className="mt-2 text-[13.5px] text-sub">{l}</div>
          </motion.div>
        ))}
      </motion.section>

      {/* story */}
      <div className="space-y-14 px-5 py-10 md:space-y-20 md:px-10">
        {TRIBUTE.map((s, k) => {
          const pi = PHOTOS.findIndex((p) => p.id === s.photo);
          return (
            <section key={s.id} id={s.id} className={cx('grid items-center gap-6 md:gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]', k % 2 === 1 && 'lg:[&>*:first-child]:order-2')}>
              <motion.button type="button" {...reveal} onClick={() => pi >= 0 && setLb(pi)} className="group relative block overflow-hidden rounded-xl shadow-[0_20px_60px_rgba(0,0,0,.5)]" aria-label={`Open photo: ${PHOTOS[pi]?.caption ?? ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <motion.img layoutId={'photo-' + s.photo} src={photo(s.photo)} alt="" className="aspect-[4/3] w-full object-cover object-[50%_25%] transition-transform duration-[1.2s] ease-[var(--ease-out-quint)] group-hover:scale-105 lg:aspect-[4/5]" />
                <i className="weave absolute inset-x-0 bottom-0 block h-2" />
              </motion.button>
              <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.08 }}>
                <div className="text-[13px] font-bold tracking-[0.18em] text-accent uppercase">{String(k + 1).padStart(2, '0')}</div>
                <h2 className="mt-2 text-[clamp(28px,3.4vw,44px)] leading-[1.05] font-black tracking-tight">{s.title}</h2>
                {s.paras.map((p, j) => (
                  <p key={j} className="mt-4 max-w-[62ch] text-[16.5px] leading-relaxed text-white/80 md:text-[17.5px]">
                    {p}
                  </p>
                ))}
              </motion.div>
            </section>
          );
        })}
      </div>

      {/* timeline */}
      <section className="px-5 py-8 md:px-10">
        <h2 className="text-[clamp(24px,2.6vw,32px)] font-black tracking-tight">A life in five moments</h2>
        <div className="relative mt-6 max-w-[760px] pl-8">
          <motion.span className="absolute top-2 bottom-2 left-[9px] w-0.5 origin-top rounded bg-gradient-to-b from-accent via-muga to-white/20" initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true, margin: '0px 0px -100px 0px' }} transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }} />
          {TIMELINE.map((t, k) => (
            <motion.div key={t.year} className="relative pb-7" initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '0px 0px -60px 0px' }} transition={{ delay: k * 0.12, type: 'spring', stiffness: 160, damping: 22 }}>
              <span className="absolute top-1.5 -left-8 grid h-5 w-5 place-items-center rounded-full bg-[#121212] ring-2 ring-accent">
                <span className="h-2 w-2 rounded-full bg-accent" />
              </span>
              <div className="text-[22px] font-black text-white tabular">{t.year}</div>
              <p className="mt-0.5 text-[15.5px] text-white/75">{t.text}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/collection/essentials" className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-[15px] font-bold text-cream transition-transform hover:scale-[1.03] hover:bg-accent-hi">
            Listen to the essentials
          </Link>
          <Link href="/songs" className="inline-flex h-11 items-center rounded-full border border-white/30 px-6 text-[15px] font-bold transition-transform hover:scale-[1.03] hover:border-white">
            Browse all {fmt(nav.songs)} songs
          </Link>
        </div>
      </section>

      {/* gallery */}
      <section id="photos" className="px-5 pt-10 pb-6 md:px-10">
        <h2 className="text-[clamp(24px,2.6vw,32px)] font-black tracking-tight">Photos</h2>
        <motion.div className="mt-4 columns-2 gap-3 sm:columns-3 lg:columns-4" initial="hidden" whileInView="show" viewport={{ once: true, margin: '0px 0px -40px 0px' }} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}>
          {PHOTOS.map((p, k) => (
            <motion.button key={p.id} type="button" onClick={() => setLb(k)} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="group mb-3 block w-full overflow-hidden rounded-lg break-inside-avoid" aria-label={`Open photo: ${p.caption}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <motion.img layoutId={TRIBUTE.some((s) => s.photo === p.id) ? undefined : 'photo-' + p.id} src={p.src} alt={p.caption} loading="lazy" className="w-full transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-[1.04]" style={{ aspectRatio: `${p.w} / ${p.h}` }} />
            </motion.button>
          ))}
        </motion.div>
      </section>

      {/* about the site */}
      <section className="mx-5 my-10 grid gap-8 rounded-xl bg-white/[.04] p-5 ring-1 ring-white/5 md:mx-10 md:grid-cols-2 md:p-8">
        <div>
          <h2 className="text-[22px] font-black tracking-tight">How playback works</h2>
          <ul className="mt-3 space-y-2.5 text-[14.5px] text-white/75">
            <li><b className="text-muga">Full song</b> plays the song’s official upload from his labels’ YouTube channels (or the video cited on Wikipedia) in YouTube’s own player, controlled from the bar, and moves on to the next song when it ends.</li>
            <li><b className="text-white">Preview</b> is Apple Music’s free 30-second clip; these play in the bar and move on by themselves.</li>
            <li><b className="text-[#7fd08a]">Spotify</b> uses Spotify’s embedded player: the full song if you are signed in to Spotify in this browser, a preview otherwise.</li>
            <li><b className="text-[#7fc3b0]">JioSaavn</b> opens JioSaavn’s album player; it plays full songs, but you pick the track inside it.</li>
            <li><b className="text-white">Links only</b>: no free player was found; the song’s menu links to its source and a YouTube search.</li>
          </ul>
          <p className="mt-3 text-[13.5px] text-sub">Turn on “Prefer full-length players” in the Now Playing view to use JioSaavn before the previews. Your liked songs, playlists and history are saved by this site’s own server.</p>
        </div>
        <div>
          <h2 className="text-[22px] font-black tracking-tight">Where the songs come from</h2>
          <p className="mt-3 text-[14.5px] text-white/75">
            {fmt(stats.wiki)} songs come from Wikipedia’s{' '}
            <a href="https://en.wikipedia.org/wiki/List_of_songs_recorded_by_Zubeen_Garg" target="_blank" rel="noopener noreferrer" className="font-semibold text-white underline-offset-2 hover:underline">
              List of songs recorded by Zubeen Garg
            </a>
            . {fmt(stats.saavn)} more were found only on JioSaavn, {fmt(stats.apple)} only on Apple Music, {fmt(stats.mb)} only on MusicBrainz and {fmt(stats.yt)} only on the YouTube channels of his labels (NK Production, RDC Assamese Official, DIGI Music, Times Music Axom, Dhwani Records and Zubeen Garg Music). Spelling variants such as Xun and Hun count as the same title; remixes, lofi and unplugged versions are kept separate.
          </p>
          <p className="mt-3 text-[14.5px] text-white/75">
            He is said to have recorded over 38,000 songs, so this is still a fraction of his work. Language tags on streaming-only songs come from those services and are sometimes wrong. There are also{' '}
            <Link href="/credits" className="font-semibold text-white hover:underline">
              {fmt(stats.credits)} credits
            </Link>{' '}
            for songs he wrote or composed for others.
          </p>
          <h3 className="mt-5 text-[15px] font-bold">Photo credits</h3>
          <p className="mt-1 text-[13px] text-sub">Photos were gathered from public image search results and belong to their photographers and publishers. Sources: {[...new Set(PHOTOS.map((p) => p.credit))].join(', ')}. Album artwork loads from JioSaavn and Apple Music.</p>
        </div>
      </section>
      <p className="px-5 pb-6 text-[13px] text-sub md:px-10">An unofficial, fan-made tribute. It hosts no audio.</p>
      <Lightbox index={lb} setIndex={setLb} />
    </div>
  );
}
