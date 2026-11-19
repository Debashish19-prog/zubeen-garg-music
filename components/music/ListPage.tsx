'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ListFilters, ListPayload, ListType, PlayContext } from '@/lib/types';
import { ARTIST_AVATAR, NATIVE, TILE_COLORS } from '@/lib/meta';
import { fmt, hash, longDuration } from '@/lib/text';
import { fetchList } from '@/lib/client/api';
import { openListMenu, playContext } from '@/lib/client/menus';
import { useContextState } from '@/lib/client/hooks';
import { usePlayer } from '@/store/player';
import { Cover, LikedCover, MosaicCover, PersonAvatar, PhotoCover, UploadsCover } from '@/components/ui/Cover';
import { IconChevronDown, IconExternal, IconSearch } from '@/components/ui/Icons';
import { ActionBar, Dot, PageBody, PageHeader, PageTop } from './Page';
import TrackList from './TrackList';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export type CoverSpec =
  | { type: 'art'; src: string; name: string }
  | { type: 'photo'; src: string; name: string; color: string; mix?: boolean }
  | { type: 'liked' }
  | { type: 'uploads' }
  | { type: 'mosaic'; imgs: string[]; name: string }
  | { type: 'person'; name: string }
  | { type: 'glyph'; text: string; name: string };

export function renderCover(c: CoverSpec) {
  switch (c.type) {
    case 'art': return <Cover src={c.src} name={c.name} eager textSize="text-[clamp(16px,2.2vw,28px)]" />;
    case 'photo': return <PhotoCover src={c.src} name={c.name} color={c.color} mix={c.mix} />;
    case 'liked': return <LikedCover />;
    case 'uploads': return <UploadsCover />;
    case 'mosaic': return <MosaicCover imgs={c.imgs} name={c.name} />;
    case 'person': return <PersonAvatar name={c.name} className="w-full text-[40px]" />;
    case 'glyph':
      return (
        <div className="font-bangla relative grid aspect-square place-items-center overflow-hidden rounded-md text-[clamp(44px,7vw,92px)] font-black text-white/90" style={{ background: `linear-gradient(135deg, ${TILE_COLORS[hash(c.name) % TILE_COLORS.length]}, #121212 140%)` }}>
          <span className="px-3 text-center leading-none">{c.text}</span>
          <i className="weave absolute inset-x-0 bottom-0 block h-[6%]" />
        </div>
      );
  }
}

export interface FilterSpec {
  lang?: boolean;
  dec?: boolean;
  kind?: boolean;
  options?: { langs: string[]; decades: number[]; kinds: string[] };
}

function Pill({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: [string, string][]; label: string }) {
  return (
    <label className="relative inline-flex h-8 shrink-0 items-center">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cx('h-8 cursor-pointer appearance-none rounded-full pr-8 pl-3 text-[13px] font-semibold outline-none transition-colors', value ? 'bg-white text-black' : 'bg-white/[.08] text-white hover:bg-white/[.14]')}>
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

export default function ListPage({
  ctx,
  kind,
  title,
  desc,
  cover,
  color,
  list,
  source,
  filters,
  showCover = true,
  showAlbum = true,
  numbered = true,
  meta,
  links,
  defaultSort = 'none',
  actions,
  empty,
  artist,
}: {
  ctx: PlayContext;
  kind: string;
  /** byline in place of "Zubeen Garg" (label releases sung by other artists) */
  artist?: string;
  title: string;
  desc?: string;
  cover: CoverSpec;
  color: string;
  list: ListPayload;
  source?: { type: ListType; key: string };
  filters?: FilterSpec;
  showCover?: boolean;
  showAlbum?: boolean;
  numbered?: boolean;
  meta?: string[];
  links?: { label: string; href: string }[];
  defaultSort?: ListFilters['sort'];
  /** extra buttons at the end of the action bar */
  actions?: ReactNode;
  /** shown when the list has no songs */
  empty?: ReactNode;
}) {
  const [data, setData] = useState(list);
  const [f, setF] = useState<ListFilters>({ sort: defaultSort, play: '', lang: '', dec: '', kind: '', q: '' });
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const first = useRef(true);
  const { playing } = useContextState(ctx.key);

  useEffect(() => setData(list), [list]);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!source) return;
    let live = true;
    setLoading(true);
    const t = setTimeout(
      () =>
        fetchList(source.type, source.key, f)
          .then((p) => live && setData(p))
          .catch(() => undefined)
          .finally(() => live && setLoading(false)),
      f.q ? 200 : 0,
    );
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [f, source]);

  const filtered = !!(f.play || f.lang || f.dec || f.kind || f.q);
  const fctx: PlayContext = filtered ? { ...ctx, key: ctx.key + '|' + JSON.stringify(f) } : ctx;
  const play = () => playContext(data.ids, fctx);
  const shuffle = () => {
    const pl = usePlayer.getState();
    pl.playList(data.ids, 0, fctx, { shuffle: true });
  };
  const set = (k: keyof ListFilters) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const metaLine = [
    ...(meta || []),
    `${fmt(data.ids.length)} song${data.ids.length === 1 ? '' : 's'}`,
    data.duration ? longDuration(data.duration, data.ids.length > data.playable || data.duration < data.ids.length * 60) : '',
  ].filter(Boolean);

  return (
    <div>
      <PageTop color={color} title={title} playing={playing} onPlay={play} />
      <PageHeader
        color={color}
        kind={kind}
        title={title}
        desc={desc}
        cover={renderCover(cover)}
        round={cover.type === 'person'}
        meta={
          <>
            {!artist && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={ARTIST_AVATAR} alt="" className="mr-1 h-6 w-6 rounded-full object-cover object-top" />
            )}
            <span className="font-bold text-white">{artist || 'Zubeen Garg'}</span>
            {metaLine.map((m, k) => (
              <span key={k} className="contents">
                <Dot />
                <span>{m}</span>
              </span>
            ))}
            {data.playable < data.ids.length && (
              <>
                <Dot />
                <span className="text-white/60">{fmt(data.playable)} playable here</span>
              </>
            )}
          </>
        }
      />
      <PageBody color={color}>
        <ActionBar
          playing={playing}
          onPlay={play}
          onShuffle={shuffle}
          disabled={!data.ids.length}
          onMore={(e) => openListMenu(e, data.ids, fctx)}
          right={
            <>
              {actions}
              {links?.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="hidden h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-sub hover:text-white sm:flex">
                  {l.label} <IconExternal size={14} />
                </a>
              ))}
              {source && (
                <motion.div className="flex h-8 items-center overflow-hidden rounded" animate={{ width: searchOpen ? 220 : 32, backgroundColor: searchOpen ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,0)' }} transition={{ type: 'spring', stiffness: 400, damping: 36 }}>
                  <button type="button" aria-label="Search in this list" onClick={() => setSearchOpen(!searchOpen)} className="grid h-8 w-8 shrink-0 place-items-center text-sub hover:text-white">
                    <IconSearch size={18} />
                  </button>
                  {searchOpen && <input autoFocus value={f.q} onChange={(e) => set('q')(e.target.value)} placeholder="Search in this list" className="min-w-0 flex-1 bg-transparent pr-2 text-[13px] outline-none placeholder:text-sub" />}
                </motion.div>
              )}
              {source && (
                <Pill
                  label="Sort"
                  value={f.sort === defaultSort ? '' : f.sort || ''}
                  onChange={(v) => set('sort')(v || defaultSort || 'none')}
                  options={[
                    ['', defaultSort === 'none' ? 'Custom order' : defaultSort === 'year' ? 'Oldest first' : 'Default order'],
                    ...(defaultSort !== 'year' ? ([['year', 'Oldest first']] as [string, string][]) : []),
                    ['new', 'Newest first'],
                    ['az', 'Title A–Z'],
                  ]}
                />
              )}
            </>
          }
        />
        {source && (
          <div className="no-scrollbar -mt-2 mb-3 flex gap-2 overflow-x-auto px-4 md:px-6">
            {(
              [
                ['', 'All'],
                ['any', 'Playable here'],
                ['full', 'Full-length players'],
                ['none', 'Links only'],
              ] as [ListFilters['play'], string][]
            ).map(([v, l]) => (
              <motion.button key={l} type="button" layout onClick={() => set('play')(v || '')} className={cx('h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold transition-colors', f.play === v ? 'bg-white text-black' : 'bg-white/[.08] hover:bg-white/[.14]')}>
                {l}
              </motion.button>
            ))}
            {filters?.lang && filters.options && <Pill label="Language" value={f.lang || ''} onChange={set('lang')} options={[['', 'Any language'], ...filters.options.langs.map((l) => [l, `${l}${NATIVE[l] && NATIVE[l] !== l && l !== 'Unspecified' ? ' · ' + NATIVE[l] : ''}`] as [string, string])]} />}
            {filters?.dec && filters.options && <Pill label="Decade" value={f.dec || ''} onChange={set('dec')} options={[['', 'Any year'], ...filters.options.decades.map((d) => [String(d), `${d}s`] as [string, string]), ['0', 'Year unknown']]} />}
            {filters?.kind && filters.options && <Pill label="Type" value={f.kind || ''} onChange={set('kind')} options={[['', 'Any type'], ...filters.options.kinds.map((k) => [k, k === 'Releases' ? 'Streaming releases' : k] as [string, string])]} />}
          </div>
        )}
        <div className={cx('transition-opacity duration-300', loading && 'opacity-50')}>
          <AnimatePresence>
            {filtered && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-4 pb-2 text-[13px] text-sub md:px-6">
                {fmt(data.ids.length)} matching song{data.ids.length === 1 ? '' : 's'}
              </motion.p>
            )}
          </AnimatePresence>
          <TrackList ids={data.ids} initial={data.songs} ctx={fctx} showCover={showCover} showAlbum={showAlbum} numbered={numbered} empty={filtered ? 'No songs match these filters.' : (empty ?? 'No songs here yet.')} />
        </div>
      </PageBody>
    </div>
  );
}
