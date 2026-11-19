'use client';
import { UPLOAD_BASE, albumHref, artistOf } from '@/lib/meta';
import type { Song, PlayContext } from '@/lib/types';
import { useUI, type MenuItem, toast } from '@/store/ui';
import { usePlayer } from '@/store/player';
import { useLibrary } from '@/store/library';
import { IconAlbum, IconExternal, IconHeart, IconHeartOutline, IconPlay, IconPlayNext, IconPlus, IconQueueAdd, IconSearch, IconShare, IconTrash, IconNote, IconPencil, IconShuffle } from '@/components/ui/Icons';
import { getSongs, withTg } from './songCache';
import { useOwner } from '@/store/owner';
import { IconUpload } from '@/components/ui/Icons';

/** Right-click opens at the pointer; a "..." button opens just below the button. */
function pointFrom(e: React.MouseEvent) {
  if (e.type === 'contextmenu') return { x: e.clientX, y: e.clientY };
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return { x: r.right - 4, y: r.bottom + 4 };
}

function addToPlaylistItems(ids: number[]): MenuItem[] {
  const lib = useLibrary.getState();
  return [
    {
      label: 'New playlist',
      icon: <IconPlus />,
      onSelect: async () => {
        const p = await lib.createPlaylist(undefined, ids);
        if (p) toast(`Added to ${p.name}.`);
      },
    },
    ...(lib.playlists.length ? [{ divider: true } as MenuItem] : []),
    ...lib.playlists.map((p) => ({ label: p.name, icon: <IconNote />, onSelect: () => lib.addToPlaylist(p.id, ids) })),
  ];
}

async function deleteUpload(key: string, title: string) {
  const r = await fetch('/api/uploads/' + encodeURIComponent(key), { method: 'DELETE' }).catch(() => null);
  const body = r ? ((await r.json().catch(() => ({}))) as { error?: string }) : { error: 'The server didn’t answer.' };
  if (!r?.ok) return toast(body.error || 'Couldn’t remove it.');
  await useOwner.getState().refreshUploads();
  toast(`Removed the upload of “${title}” and deleted it from Telegram.`);
}

/** Owner-only: attach a file to a catalogue song, replace it, or delete it from Telegram. */
function uploadItems(s: Song): MenuItem[] {
  if (!useOwner.getState().owner) return [];
  const tg = withTg(s).tg;
  const key = tg.split('/').pop() || '';
  const items: MenuItem[] = [{ divider: true }];
  if (s.id < UPLOAD_BASE) items.push({ label: tg ? 'Replace uploaded audio' : 'Upload audio for this song', icon: <IconUpload />, onSelect: () => useOwner.getState().openUpload(s) });
  if (tg)
    items.push({
      label: s.id >= UPLOAD_BASE ? 'Delete this upload' : 'Remove uploaded audio',
      icon: <IconTrash />,
      danger: true,
      submenu: [{ label: 'Yes, delete it from Telegram', icon: <IconTrash />, danger: true, onSelect: () => void deleteUpload(key, s.t) }],
    });
  return items.length > 1 ? items : [];
}

export function songMenuItems(s: Song, opts: { playlistId?: string } = {}): MenuItem[] {
  const pl = usePlayer.getState();
  const lib = useLibrary.getState();
  const liked = lib.liked.has(s.id);
  const yts = 'https://www.youtube.com/results?search_query=' + encodeURIComponent('Zubeen Garg ' + s.t);
  const links = Object.entries(s.L || {}).map(([k, u]) => ({ label: k.replace('Source: ', ''), href: u, external: true, icon: <IconExternal /> }));
  return [
    { label: s.t, heading: true },
    { label: 'Play', icon: <IconPlay />, onSelect: () => pl.playList([s.id], 0, { key: 'song:' + s.id, label: s.t, href: albumHref(s), img: s.img, kind: 'Song' }) },
    { label: 'Play next', icon: <IconPlayNext />, onSelect: () => pl.playNext([s.id]) },
    { label: 'Add to queue', icon: <IconQueueAdd />, onSelect: () => pl.addToQueue([s.id]) },
    { divider: true },
    { label: 'Add to playlist', icon: <IconPlus />, submenu: addToPlaylistItems([s.id]) },
    ...(opts.playlistId ? [{ label: 'Remove from this playlist', icon: <IconTrash />, onSelect: () => lib.removeFromPlaylist(opts.playlistId!, [s.id]) }] : []),
    { label: liked ? 'Remove from Liked Songs' : 'Save to Liked Songs', icon: liked ? <IconHeart className="text-accent" /> : <IconHeartOutline />, onSelect: () => lib.toggleLike(s.id) },
    { divider: true },
    { label: 'Go to album', icon: <IconAlbum />, href: albumHref(s) },
    { label: 'Listen elsewhere', icon: <IconExternal />, submenu: [...links, { label: 'Search YouTube', href: yts, external: true, icon: <IconSearch /> }] },
    {
      label: 'Copy song info',
      icon: <IconShare />,
      onSelect: () => {
        const txt = `${s.t} (${artistOf(s)}) from ${s.an}${s.y ? ', ' + s.y : ''}`;
        navigator.clipboard?.writeText(txt).then(() => toast('Copied to the clipboard.'), () => toast('Could not copy.'));
      },
    },
    ...uploadItems(s),
  ];
}

export function openSongMenu(e: React.MouseEvent, s: Song, opts: { playlistId?: string } = {}) {
  e.preventDefault();
  e.stopPropagation();
  const p = pointFrom(e);
  useUI.getState().openMenu(p.x, p.y, songMenuItems(s, opts));
}

/** Menu for a whole list (album, collection, playlist). */
export function openListMenu(e: React.MouseEvent, ids: number[], ctx: PlayContext, extra: MenuItem[] = []) {
  e.preventDefault();
  e.stopPropagation();
  const p = pointFrom(e);
  openListMenuAt(p.x, p.y, ids, ctx, extra);
}

/** Same, for when the ids arrive asynchronously (cards fetch them on demand). */
export async function openListMenuLazy(e: React.MouseEvent, getIds: () => Promise<number[]>, ctx: PlayContext, extra: MenuItem[] = []) {
  e.preventDefault();
  e.stopPropagation();
  const p = pointFrom(e);
  const ids = await getIds();
  openListMenuAt(p.x, p.y, ids, ctx, extra);
}

export function openListMenuAt(x: number, y: number, ids: number[], ctx: PlayContext, extra: MenuItem[] = []) {
  const pl = usePlayer.getState();
  useUI.getState().openMenu(x, y, [
    { label: ctx.label, heading: true },
    { label: 'Play', icon: <IconPlay />, onSelect: () => pl.playList(ids, 0, ctx) },
    { label: 'Shuffle play', icon: <IconShuffle />, onSelect: () => pl.playList(ids, 0, ctx, { shuffle: true }) },
    { label: 'Add to queue', icon: <IconQueueAdd />, onSelect: () => pl.addToQueue(ids) },
    { label: 'Add to playlist', icon: <IconPlus />, submenu: addToPlaylistItems(ids) },
    {
      label: 'Save all to Liked Songs',
      icon: <IconHeartOutline />,
      onSelect: () => {
        const lib = useLibrary.getState();
        ids.slice(0, 200).forEach((i) => !lib.liked.has(i) && lib.toggleLike(i, true));
      },
    },
    ...(extra.length ? [{ divider: true } as MenuItem, ...extra] : []),
  ]);
}

export function playlistExtraItems(pid: string): MenuItem[] {
  return [
    { label: 'Edit details', icon: <IconPencil />, onSelect: () => useUI.getState().setEditPlaylist(pid) },
    { label: 'Delete playlist', icon: <IconTrash />, danger: true, onSelect: () => useLibrary.getState().deletePlaylist(pid) },
  ];
}

/** Play a context; if it's already the current context, toggle pause instead (Spotify behaviour). */
export function playContext(ids: number[], ctx: PlayContext, start = 0) {
  const pl = usePlayer.getState();
  if (pl.context?.key === ctx.key && pl.current) return pl.toggle();
  if (!ids.length) return toast('Nothing to play here yet.');
  void getSongs(ids.slice(0, 50));
  pl.playList(ids, start, ctx);
}
