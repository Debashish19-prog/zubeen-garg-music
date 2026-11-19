'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SearchPayload, Song } from '@/lib/types';
import { ARTIST_AVATAR } from '@/lib/meta';
import { fmt, longDuration } from '@/lib/text';
import { getSongs, peek, prime } from '@/lib/client/songCache';
import { openListMenu, playContext, playlistExtraItems } from '@/lib/client/menus';
import { useContextState } from '@/lib/client/hooks';
import { useLibrary } from '@/store/library';
import { usePlayer } from '@/store/player';
import { useUI } from '@/store/ui';
import { ActionBar, Dot, PageBody, PageHeader, PageTop } from '@/components/music/Page';
import TrackList from '@/components/music/TrackList';
import LibraryList from '@/components/shell/LibraryList';
import { Cover, LikedCover, MosaicCover } from '@/components/ui/Cover';
import { IconClose, IconPencil, IconPlus, IconSearch } from '@/components/ui/Icons';

function useDuration(ids: number[]) {
  const [d, setD] = useState(0);
  const sig = ids.join(',');
  useEffect(() => {
    let live = true;
    void getSongs(ids.slice(0, 500)).then((s) => live && setD(s.reduce((a, x) => a + (x.d || 0), 0)));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return d;
}

function Meta({ n, d }: { n: number; d: number }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ARTIST_AVATAR} alt="" className="mr-1 h-6 w-6 rounded-full object-cover object-top" />
      <span className="font-bold text-white">You</span>
      <Dot />
      <span>
        {fmt(n)} song{n === 1 ? '' : 's'}
      </span>
      {d > 0 && (
        <>
          <Dot />
          <span>{longDuration(d)}</span>
        </>
      )}
    </>
  );
}

export function LikedView() {
  const likes = useLibrary((s) => s.likes);
  const loaded = useLibrary((s) => s.loaded);
  const ids = useMemo(() => likes.map((l) => l.id), [likes]);
  const addedAt = useMemo(() => Object.fromEntries(likes.map((l) => [l.id, l.at])), [likes]);
  const ctx = { key: 'liked', label: 'Liked Songs', href: '/liked', kind: 'Playlist' };
  const { playing } = useContextState(ctx.key);
  const d = useDuration(ids);
  const color = '#7a1414';
  return (
    <div>
      <PageTop color={color} title="Liked Songs" playing={playing} onPlay={() => playContext(ids, ctx)} />
      <PageHeader color={color} kind="Playlist" title="Liked Songs" cover={<LikedCover />} meta={<Meta n={ids.length} d={d} />} />
      <PageBody color={color}>
        <ActionBar playing={playing} disabled={!ids.length} onPlay={() => playContext(ids, ctx)} onShuffle={() => ids.length && usePlayer.getState().playList(ids, 0, ctx, { shuffle: true })} onMore={ids.length ? (e) => openListMenu(e, ids, ctx) : undefined} />
        {loaded && (
          <TrackList
            ids={ids}
            ctx={ctx}
            showCover
            addedAt={addedAt}
            empty={
              <div className="py-6 text-center">
                <p className="text-2xl font-bold text-white">Songs you like will appear here</p>
                <p className="mt-2">Save songs by tapping the heart.</p>
                <Link href="/search" className="mt-6 inline-flex h-12 items-center rounded-full bg-white px-8 font-bold text-black transition-transform hover:scale-105">
                  Find songs
                </Link>
              </div>
            }
          />
        )}
      </PageBody>
    </div>
  );
}

function FindForPlaylist({ pid, have }: { pid: string; have: Set<number> }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Song[]>([]);
  const [open, setOpen] = useState(true);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    if (!q.trim()) return setRes([]);
    t.current = setTimeout(async () => {
      const d = (await fetch('/api/search?q=' + encodeURIComponent(q)).then((r) => r.json())) as SearchPayload;
      prime(d.songs);
      setRes(d.songs.slice(0, 12));
    }, 200);
  }, [q]);
  if (!open)
    return (
      <div className="px-4 py-6 text-right md:px-6">
        <button type="button" onClick={() => setOpen(true)} className="text-[14px] font-bold text-sub hover:text-white">
          Find more
        </button>
      </div>
    );
  return (
    <section className="mt-6 border-t border-white/10 px-4 pt-6 md:px-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Let’s find something for your playlist</h2>
        <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sub hover:text-white">
          <IconClose size={20} />
        </button>
      </div>
      <div className="mt-4 flex h-10 max-w-[380px] items-center gap-2 rounded bg-white/10 px-3">
        <IconSearch size={18} className="text-sub" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for songs or albums" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-sub" />
      </div>
      <div className="mt-4 space-y-1">
        <AnimatePresence initial={false}>
          {res
            .filter((s) => !have.has(s.id))
            .map((s) => (
              <motion.div key={s.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40, height: 0 }} className="flex items-center gap-3 rounded-md p-2 hover:bg-white/10">
                <div className="w-10 shrink-0">
                  <Cover src={s.img} name={s.an} rounded="rounded" textSize="text-[6px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px]">{s.t}</div>
                  <div className="truncate text-[13px] text-sub">
                    {s.an}
                    {s.y ? ' · ' + s.y : ''}
                  </div>
                </div>
                <button type="button" onClick={() => useLibrary.getState().addToPlaylist(pid, [s.id])} className="h-8 shrink-0 rounded-full border border-white/40 px-4 text-[13px] font-bold transition-transform hover:scale-105 hover:border-white">
                  Add
                </button>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

export function PlaylistView({ id }: { id: string }) {
  const p = useLibrary((s) => s.playlists.find((x) => x.id === id));
  const loaded = useLibrary((s) => s.loaded);
  const ids = useMemo(() => p?.songs.map((s) => s.id) ?? [], [p]);
  const addedAt = useMemo(() => Object.fromEntries((p?.songs ?? []).map((s) => [s.id, s.at])), [p]);
  const have = useMemo(() => new Set(ids), [ids]);
  const ctx = { key: 'playlist:' + id, label: p?.name ?? 'Playlist', href: '/playlist/' + id, kind: 'Playlist' };
  const { playing } = useContextState(ctx.key);
  const d = useDuration(ids);
  const [, bump] = useState(0);
  useEffect(() => {
    const miss = ids.slice(0, 8).filter((i) => !peek(i));
    if (miss.length) void getSongs(miss).then(() => bump((x) => x + 1));
  }, [ids]);
  if (!loaded) return <div className="m-6 h-64 rounded-lg shimmer" />;
  if (!p)
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-2xl font-bold">This playlist doesn’t exist</p>
        <p className="mt-2 text-sub">It may have been deleted.</p>
      </div>
    );
  const color = '#3a3a3a';
  const edit = () => useUI.getState().setEditPlaylist(p.id);
  return (
    <div>
      <PageTop color={color} title={p.name} playing={playing} onPlay={() => playContext(ids, ctx)} />
      <div onClick={edit} className="cursor-pointer" title="Edit details">
        <PageHeader color={color} kind="Playlist" title={p.name} desc={p.desc} cover={<MosaicCover name={p.name} imgs={p.songs.slice(0, 12).map((s) => peek(s.id)?.img || '')} />} meta={<Meta n={ids.length} d={d} />} />
      </div>
      <PageBody color={color}>
        <ActionBar
          playing={playing}
          disabled={!ids.length}
          onPlay={() => playContext(ids, ctx)}
          onShuffle={ids.length ? () => usePlayer.getState().playList(ids, 0, ctx, { shuffle: true }) : undefined}
          onMore={(e) => {
            if (ids.length) openListMenu(e, ids, ctx, playlistExtraItems(p.id));
            else {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              useUI.getState().openMenu(r.left, r.bottom + 4, playlistExtraItems(p.id));
            }
          }}
          right={
            <button type="button" onClick={edit} className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-sub hover:text-white">
              <IconPencil size={15} /> Edit details
            </button>
          }
        />
        {ids.length > 0 && <TrackList ids={ids} ctx={ctx} showCover addedAt={addedAt} playlistId={p.id} />}
        <FindForPlaylist pid={p.id} have={have} />
      </PageBody>
    </div>
  );
}

export function LibraryView() {
  const router = useRouter();
  return (
    <div className="flex h-[calc(100dvh-var(--tabs-h)-80px)] flex-col md:h-[calc(100dvh-var(--bar-h)-96px)]">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 md:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ARTIST_AVATAR} alt="" className="h-9 w-9 rounded-full object-cover object-top" />
        <h1 className="flex-1 text-2xl font-bold">Your Library</h1>
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          aria-label="Create playlist"
          onClick={async () => {
            const p = await useLibrary.getState().createPlaylist();
            if (p) router.push('/playlist/' + p.id);
          }}
          className="grid h-10 w-10 place-items-center rounded-full text-white hover:bg-white/10"
        >
          <IconPlus size={26} />
        </motion.button>
      </div>
      <LibraryList />
    </div>
  );
}

