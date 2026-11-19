'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState, type ReactNode } from 'react';
import { COLLECTIONS, MIXES, NATIVE, TILE_COLORS, ARTIST_AVATAR } from '@/lib/meta';
import { fmt, norm } from '@/lib/text';
import { useLibrary } from '@/store/library';
import { usePlayer } from '@/store/player';
import { useUI } from '@/store/ui';
import { peek } from '@/lib/client/songCache';
import { playlistExtraItems } from '@/lib/client/menus';
import { Cover, LikedCover, MosaicCover, PhotoCover, UploadsCover } from '@/components/ui/Cover';
import { useOwner } from '@/store/owner';
import { IconClose, IconSearch, IconSpeaker } from '@/components/ui/Icons';
import { ctxKeyFromHref, useShellData } from './ShellData';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

interface Item {
  key: string;
  href: string;
  title: string;
  sub: string;
  cover: ReactNode;
  group: 'Playlists' | 'Collections' | 'Albums' | 'Languages' | 'Artist';
  round?: boolean;
  drop?: 'liked' | string;
  menuPid?: string;
}
const FILTERS = ['Playlists', 'Collections', 'Albums', 'Languages'] as const;

function useItems(): Item[] {
  const nav = useShellData();
  const likes = useLibrary((s) => s.likes);
  const playlists = useLibrary((s) => s.playlists);
  const recents = useLibrary((s) => s.recents);
  const uploads = useOwner((s) => s.uploadIds.length);
  return useMemo(() => {
    const counts = Object.fromEntries(nav.collections.map((c) => [c.key, c.count]));
    const items: Item[] = [
      { key: 'liked', href: '/liked', title: 'Liked Songs', sub: `Playlist · ${fmt(likes.length)} song${likes.length === 1 ? '' : 's'}`, cover: <LikedCover rounded="rounded" />, group: 'Playlists', drop: 'liked' },
      ...(uploads
        ? [{ key: 'uploads', href: '/uploads', title: 'Uploads', sub: `Playlist · ${fmt(uploads)} full song${uploads === 1 ? '' : 's'}`, cover: <UploadsCover rounded="rounded" />, group: 'Playlists' as const }]
        : []),
      ...playlists.map((p) => ({
        key: 'playlist:' + p.id,
        href: '/playlist/' + p.id,
        title: p.name,
        sub: `Playlist · ${fmt(p.songs.length)} song${p.songs.length === 1 ? '' : 's'}`,
        cover: <MosaicCover rounded="rounded" name={p.name} imgs={p.songs.slice(0, 12).map((s) => peek(s.id)?.img || '')} />,
        group: 'Playlists' as const,
        drop: p.id,
        menuPid: p.id,
      })),
      { key: 'artist', href: '/', title: 'Zubeen Garg', sub: 'Artist', cover: <Cover src={ARTIST_AVATAR} name="Zubeen Garg" rounded="rounded-full" />, group: 'Artist', round: true },
      ...[...COLLECTIONS, ...MIXES].map((c) => ({
        key: 'col:' + c.key,
        href: '/collection/' + c.key,
        title: c.name,
        sub: `${c.mix ? 'Mix' : 'Collection'} · ${fmt(counts[c.key] ?? 0)} songs`,
        cover: <PhotoCover src={c.photo} name={c.name} color={c.color} rounded="rounded" compact />,
        group: 'Collections' as const,
      })),
    ];
    const seen = new Set(items.map((i) => i.key));
    for (const r of recents) {
      const key = ctxKeyFromHref(r.href);
      if (seen.has(key) || !r.href.startsWith('/album/')) continue;
      seen.add(key);
      items.splice(2 + playlists.length + (uploads ? 1 : 0), 0, { key, href: r.href, title: r.label, sub: `Album · Zubeen Garg`, cover: <Cover src={r.img} name={r.label} rounded="rounded" textSize="text-[7px]" />, group: 'Albums' });
    }
    nav.langs
      .filter((l) => l.name !== 'Unspecified')
      .slice(0, 8)
      .forEach((l, k) =>
        items.push({
          key: 'lang:' + l.name,
          href: '/language/' + encodeURIComponent(l.name),
          title: l.name,
          sub: `Language · ${fmt(l.count)} songs`,
          cover: (
            <div className="font-bangla grid aspect-square place-items-center overflow-hidden rounded text-[18px] font-black text-white/90" style={{ background: TILE_COLORS[k % TILE_COLORS.length] }}>
              {(NATIVE[l.name] || l.name).slice(0, 3)}
            </div>
          ),
          group: 'Languages',
        }),
      );
    return items;
  }, [nav, likes.length, playlists, recents, uploads]);
}

function LibRow({ it, collapsed }: { it: Item; collapsed?: boolean }) {
  const path = usePathname();
  const active = decodeURIComponent(path) === decodeURIComponent(it.href.split('?')[0]) && it.key !== 'artist' ? true : it.key === 'artist' && path === '/';
  const ctxKey = usePlayer((s) => s.context?.key);
  const playing = usePlayer((s) => s.status === 'playing' || s.status === 'loading');
  const isCtx = ctxKey === it.key;
  const [over, setOver] = useState(false);
  const openMenu = useUI((s) => s.openMenu);

  return (
    <motion.div layout="position" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ type: 'spring', stiffness: 400, damping: 34 }}>
      <Link
        href={it.href}
        data-tip={collapsed ? it.title : undefined}
        onContextMenu={
          it.menuPid
            ? (e) => {
                e.preventDefault();
                openMenu(e.clientX, e.clientY, playlistExtraItems(it.menuPid!));
              }
            : undefined
        }
        onDragOver={
          it.drop
            ? (e) => {
                if (e.dataTransfer.types.includes('application/x-zg-songs')) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                  setOver(true);
                }
              }
            : undefined
        }
        onDragLeave={() => setOver(false)}
        onDrop={
          it.drop
            ? (e) => {
                e.preventDefault();
                setOver(false);
                const ids = JSON.parse(e.dataTransfer.getData('application/x-zg-songs') || '[]') as number[];
                const lib = useLibrary.getState();
                if (it.drop === 'liked') ids.forEach((i) => lib.toggleLike(i, true));
                else void lib.addToPlaylist(it.drop!, ids);
              }
            : undefined
        }
        className={cx(
          'flex items-center gap-3 rounded-md p-2 transition-colors duration-200',
          active ? 'bg-white/10 hover:bg-white/[.14]' : 'hover:bg-white/[.07] active:bg-black',
          over && 'bg-accent/30 ring-2 ring-accent',
          collapsed && 'justify-center',
        )}
      >
        <div className={cx('w-12 shrink-0', it.round && '[&>*]:rounded-full')}>{it.cover}</div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div className={cx('truncate text-[15px] font-medium', isCtx ? 'text-accent' : 'text-white')}>{it.title}</div>
              <div className="truncate text-[13.5px] text-sub">{it.sub}</div>
            </div>
            {isCtx && playing && <IconSpeaker size={16} className="shrink-0 text-accent" />}
          </>
        )}
      </Link>
    </motion.div>
  );
}

export default function LibraryList({ collapsed }: { collapsed?: boolean }) {
  const items = useItems();
  const [filter, setFilter] = useState<(typeof FILTERS)[number] | null>(null);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const shown = items.filter((it) => (!filter || it.group === filter) && (!q || norm(it.title).includes(norm(q))));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!collapsed && (
        <div className="no-scrollbar flex shrink-0 items-center gap-2 overflow-x-auto px-4 pb-2">
          <AnimatePresence initial={false}>
            {filter && (
              <motion.button
                key="clear"
                type="button"
                aria-label="Clear filter"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => setFilter(null)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[.07] hover:bg-white/[.12]"
              >
                <IconClose size={16} />
              </motion.button>
            )}
          </AnimatePresence>
          {FILTERS.filter((f) => !filter || f === filter).map((f) => (
            <motion.button
              layout
              key={f}
              type="button"
              onClick={() => setFilter(filter === f ? null : f)}
              className={cx('h-8 shrink-0 rounded-full px-3 text-[14px] font-medium transition-colors', filter === f ? 'bg-white text-black' : 'bg-white/[.07] hover:bg-white/[.12]')}
            >
              {f}
            </motion.button>
          ))}
        </div>
      )}
      {!collapsed && (
        <div className="flex shrink-0 items-center px-2 pb-1">
          <motion.div className="flex h-9 items-center overflow-hidden rounded" animate={{ width: searching ? 220 : 36, backgroundColor: searching ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,0)' }} transition={{ type: 'spring', stiffness: 400, damping: 36 }}>
            <button type="button" aria-label="Search in Your Library" onClick={() => setSearching(!searching)} className="grid h-9 w-9 shrink-0 place-items-center text-sub hover:text-white">
              <IconSearch size={18} />
            </button>
            {searching && <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => !q && setSearching(false)} placeholder="Search in Your Library" className="min-w-0 flex-1 bg-transparent pr-2 text-[13px] outline-none placeholder:text-sub" />}
          </motion.div>
          <span className="ml-auto pr-2 text-[13px] text-sub">Recents</span>
        </div>
      )}
      <div className={cx('scroll-y min-h-0 flex-1 pb-2', collapsed ? 'px-1' : 'px-2')}>
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((it) => (
            <LibRow key={it.key} it={it} collapsed={collapsed} />
          ))}
        </AnimatePresence>
        {!shown.length && <p className="px-3 py-6 text-[14px] text-sub">Nothing matches.</p>}
      </div>
    </div>
  );
}

