'use client';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Album } from '@/lib/types';
import { KIND_LABEL } from '@/lib/meta';
import { fmt } from '@/lib/text';
import { Card, staggerVariants } from '@/components/music/Cards';
import { Cover } from '@/components/ui/Cover';
import { IconChevronDown, IconSearch } from '@/components/ui/Icons';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
const KINDS: [string, string][] = [
  ['', 'All'],
  ['Film songs', 'Films'],
  ['Album songs', 'Albums'],
  ['Releases', 'Streaming releases'],
  ['Singles', 'Singles'],
  ['Theatre songs', 'Mobile theatre'],
  ['Theme songs', 'Theme songs'],
  ['TV & web series', 'Series'],
];

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: [string, string][]; label: string }) {
  return (
    <label className="relative inline-flex h-8 shrink-0 items-center">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cx('h-8 cursor-pointer appearance-none rounded-full pr-8 pl-3 text-[13px] font-semibold outline-none', value ? 'bg-white text-black' : 'bg-white/[.08] hover:bg-white/[.14]')}>
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-[#282828] text-white">
            {l}
          </option>
        ))}
      </select>
      <IconChevronDown size={14} className={cx('pointer-events-none absolute right-2.5', value ? 'text-black' : 'text-sub')} />
    </label>
  );
}

export default function AlbumsView({ langs, decades }: { langs: string[]; decades: number[] }) {
  const sp = useSearchParams();
  const [f, setF] = useState({ kind: sp.get('kind') || '', lang: '', dec: '', sort: sp.get('sort') || 'songs', q: '' });
  const [albums, setAlbums] = useState<Album[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const req = useRef(0);

  const load = async (offset: number) => {
    const my = ++req.current;
    setLoading(true);
    const q = new URLSearchParams({ ...f, offset: String(offset), limit: '60' });
    const r = await fetch('/api/albums?' + q.toString()).then((x) => x.json());
    if (my !== req.current) return;
    setTotal(r.total);
    setAlbums((a) => (offset ? [...a, ...r.albums] : r.albums));
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => void load(0), f.q ? 200 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => es[0].isIntersecting && !loading && albums.length < total && void load(albums.length), { rootMargin: '0px 0px 900px 0px' });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albums.length, total, loading]);

  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <div className="pb-10">
      <div className="bg-gradient-to-b from-[#3b2f6b] to-transparent px-4 pt-6 pb-4 md:px-6 md:pt-16">
        <h1 className="text-[32px] font-black tracking-tight md:text-[56px]">Albums &amp; Films</h1>
        <p className="mt-1 text-[14px] text-white/75">{fmt(total)} albums, films, plays and singles</p>
      </div>
      <div className="sticky top-0 z-10 bg-surface/95 py-3 backdrop-blur">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 md:px-6">
          {KINDS.map(([v, l]) => (
            <button key={l} type="button" onClick={() => set('kind')(v)} className={cx('relative h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold', f.kind === v ? 'text-black' : 'bg-white/[.08] hover:bg-white/[.14]')}>
              {f.kind === v && <motion.span layoutId="album-kind" className="absolute inset-0 rounded-full bg-white" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
              <span className="relative">{l}</span>
            </button>
          ))}
        </div>
        <div className="no-scrollbar mt-2 flex items-center gap-2 overflow-x-auto px-4 md:px-6">
          <div className="flex h-8 min-w-[180px] items-center gap-2 rounded-full bg-white/[.08] px-3">
            <IconSearch size={16} className="text-sub" />
            <input value={f.q} onChange={(e) => set('q')(e.target.value)} placeholder="Find an album or film" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-sub" />
          </div>
          <Select label="Language" value={f.lang} onChange={set('lang')} options={[['', 'Any language'], ...langs.map((l) => [l, l] as [string, string])]} />
          <Select label="Decade" value={f.dec} onChange={set('dec')} options={[['', 'Any year'], ...decades.map((d) => [String(d), d + 's'] as [string, string])]} />
          <Select
            label="Sort"
            value={f.sort === 'songs' ? '' : f.sort}
            onChange={(v) => set('sort')(v || 'songs')}
            options={[
              ['', 'Most songs'],
              ['new', 'Newest first'],
              ['old', 'Oldest first'],
              ['az', 'Name A–Z'],
            ]}
          />
        </div>
      </div>
      <motion.div key={JSON.stringify(f)} className={cx('grid grid-cols-2 gap-1 px-2 transition-opacity xs:grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] md:px-4', loading && !albums.length && 'opacity-50')} initial="hidden" animate="show" variants={staggerVariants}>
        {albums.map((a) => (
          <Card
            key={a.id}
            fixed={false}
            href={`/album/${a.id}`}
            title={a.n}
            sub={[a.y || '', KIND_LABEL[a.k] || '', `${a.ns} song${a.ns === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
            cover={<Cover src={a.img} name={a.n} sub={a.y ? String(a.y) : ''} />}
            play={{ ctx: { key: 'album:' + a.id, label: a.n, href: `/album/${a.id}`, img: a.img, kind: 'Album' }, type: 'album', key: String(a.id) }}
          />
        ))}
      </motion.div>
      {!loading && !albums.length && <p className="px-6 py-10 text-sub">No albums match.</p>}
      <div ref={sentinel} className="h-px" />
      {loading && albums.length > 0 && (
        <div className="flex justify-center py-6">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
        </div>
      )}
    </div>
  );
}
