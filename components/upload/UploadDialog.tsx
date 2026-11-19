'use client';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SearchPayload, Song } from '@/lib/types';
import { UPLOAD_BASE } from '@/lib/meta';
import { mmss, norm, skel } from '@/lib/text';
import { audioDuration, readTags, squareJpeg, titleFromName, type AudioTags } from '@/lib/client/audioTags';
import { prime, withTg } from '@/lib/client/songCache';
import { useOwner } from '@/store/owner';
import { usePlayer } from '@/store/player';
import { toast } from '@/store/ui';
import { useShellData } from '@/components/shell/ShellData';
import { Cover } from '@/components/ui/Cover';
import { IconCheckCircle, IconChevronDown, IconClose, IconPhoto, IconPlay, IconUpload } from '@/components/ui/Icons';
import TelegramConnect, { OwnerSignIn } from './TelegramConnect';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
const AUDIO_EXT = /\.(mp3|m4a|m4b|aac|flac|wav|ogg|oga|opus|weba|webm|mp4|aif|aiff|alac|wma)$/i;
const isAudioFile = (f: File) => f.type.startsWith('audio/') || AUDIO_EXT.test(f.name);
const fmtBytes = (n: number) => (n > 1e9 ? (n / 1e9).toFixed(2) + ' GB' : n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB');

type Status = 'reading' | 'ready' | 'uploading' | 'saving' | 'done' | 'error';
interface Details {
  an: string;
  y: string;
  l: string;
  c: string;
  m: string;
  w: string;
}
interface Item {
  uid: string;
  file: File;
  status: Status;
  progress: number;
  error: string;
  title: string;
  duration: number;
  cover: Blob | null;
  coverUrl: string;
  matches: Song[];
  /** catalogue song id to attach to, or 'new' */
  match: number | 'new';
  /** fixed by "Upload audio for this song" */
  fixed: boolean;
  details: Details;
  open: boolean;
  result: Song | null;
  /** waiting its turn after "Upload" was pressed */
  queued?: boolean;
}

/** The catalogue song a file most likely is: same title (spelling-tolerant), then album or year breaks ties. */
function bestMatch(title: string, tags: AudioTags, songs: Song[]): Song | null {
  const t = norm(title), k = skel(title);
  const exact = songs.filter((s) => norm(s.t) === t);
  const loose = exact.length ? exact : songs.filter((s) => k.length >= 4 && skel(s.t) === k);
  if (!loose.length) return null;
  const alb = norm(tags.album);
  return (
    (alb && loose.find((s) => { const a = norm(s.an); return a === alb || (a.length > 3 && (a.includes(alb) || alb.includes(a))); })) ||
    (tags.year && loose.find((s) => s.y === tags.year)) ||
    loose[0]
  );
}

function coSingers(artist?: string) {
  return (artist || '')
    .split(/,|&|;|\/|\bfeat\.?|\bft\.?|\band\b/i)
    .map((x) => x.trim())
    .filter((x) => x && !/^zub(ee|i)n( garg)?$/i.test(x))
    .join(', ');
}

async function prepare(file: File, attach: Song | null): Promise<Partial<Item>> {
  const [tags, duration] = await Promise.all([readTags(file), audioDuration(file)]);
  const title = tags.title || titleFromName(file.name) || file.name;
  const cover = tags.picture ? await squareJpeg(tags.picture) : null;
  let matches: Song[] = attach ? [attach] : [];
  let match: number | 'new' = attach ? attach.id : 'new';
  if (!attach) {
    try {
      const r = (await fetch('/api/search?q=' + encodeURIComponent(title.slice(0, 100))).then((x) => x.json())) as SearchPayload;
      matches = r.songs.filter((s) => s.id < UPLOAD_BASE).slice(0, 8);
      prime(matches);
      match = bestMatch(title, tags, matches)?.id ?? 'new';
    } catch {
      /* offline search: add as a new song */
    }
  }
  return {
    title,
    duration,
    cover,
    coverUrl: cover ? URL.createObjectURL(cover) : '',
    matches,
    match,
    details: { an: tags.album || '', y: tags.year ? String(tags.year) : '', l: 'Assamese', c: coSingers(tags.artist), m: tags.composer || '', w: tags.lyricist || '' },
    status: 'ready',
  };
}

function b64url(s: string) {
  let bin = '';
  new TextEncoder().encode(s).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Cover art first (if any), then the file, in one streamed request; the server passes it straight to Telegram. */
function send(it: Item, onProgress: (p: number) => void, xhrRef: (x: XMLHttpRequest) => void): Promise<{ song: Song | null }> {
  const target = it.match === 'new' ? null : it.matches.find((s) => s.id === it.match) ?? null;
  const withCover = !!it.cover && (!target || !target.img);
  const d = it.details;
  const meta = {
    fileName: it.file.name,
    mime: it.file.type || 'audio/mpeg',
    size: it.file.size,
    coverSize: withCover ? it.cover!.size : 0,
    duration: it.duration,
    ...(target ? { attach: target.id } : { t: it.title, an: d.an, l: d.l, y: Number(d.y) || 0, c: d.c, m: d.m, w: d.w }),
  };
  return new Promise((res, rej) => {
    const xhr = new XMLHttpRequest();
    xhrRef(xhr);
    xhr.open('POST', '/api/uploads');
    xhr.setRequestHeader('X-Upload-Meta', b64url(JSON.stringify(meta)));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let body: { song?: Song | null; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) res({ song: body.song ?? null });
      else rej(new Error(body.error || `Upload failed (HTTP ${xhr.status}).`));
    };
    xhr.onerror = () => rej(new Error('The connection to the server dropped.'));
    xhr.onabort = () => rej(new Error('Cancelled.'));
    xhr.send(new Blob(withCover ? [it.cover!, it.file] : [it.file]));
  });
}

let seq = 0;

/**
 * Upload songs to Telegram: drop or pick audio files, check which catalogue song each one is (or
 * add it as a new song), and send them one at a time. Lives for the whole session, so uploads
 * keep going while the dialog is closed.
 */
export default function UploadDialog() {
  const { open, attach, files } = useOwner((s) => s.dialog);
  const owner = useOwner((s) => s.owner);
  const auth = useOwner((s) => s.auth);
  const tg = useOwner((s) => s.tg);
  const close = useOwner((s) => s.closeUpload);
  const nav = useShellData();
  const langs = nav.langs.map((l) => l.name);
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const [globalDrag, setGlobalDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const running = useRef(false);
  const xhrs = useRef(new Map<string, XMLHttpRequest>());
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const update = useCallback((uid: string, patch: Partial<Item> | ((it: Item) => Partial<Item>)) => {
    setItems((list) => list.map((it) => (it.uid === uid ? { ...it, ...(typeof patch === 'function' ? patch(it) : patch) } : it)));
  }, []);

  const add = useCallback(
    (list: FileList | File[], fixedTo: Song | null = null) => {
      const audio = [...list].filter(isAudioFile);
      if (!audio.length) return toast('Choose audio files: MP3, M4A, FLAC, WAV, OGG or Opus.');
      const fresh: Item[] = audio.slice(0, fixedTo ? 1 : 100).map((file) => ({
        uid: 'u' + ++seq,
        file,
        status: 'reading',
        progress: 0,
        error: '',
        title: titleFromName(file.name) || file.name,
        duration: 0,
        cover: null,
        coverUrl: '',
        matches: fixedTo ? [fixedTo] : [],
        match: fixedTo ? fixedTo.id : 'new',
        fixed: !!fixedTo,
        details: { an: '', y: '', l: 'Assamese', c: '', m: '', w: '' },
        open: false,
        result: null,
      }));
      setItems((l) => [...l.filter((x) => !(fixedTo && x.fixed && x.status === 'ready')), ...fresh]);
      fresh.forEach((it) => void prepare(it.file, fixedTo).then((p) => update(it.uid, (cur) => (cur.status === 'reading' ? p : {}))));
    },
    [update],
  );

  // files handed over by "Upload audio for this song" or a drop outside the dialog
  useEffect(() => {
    if (open && files.length) {
      add(files, attach);
      useOwner.setState((s) => ({ dialog: { ...s.dialog, files: [] } }));
    }
  }, [open, files, attach, add]);

  // "Upload audio for this song": go straight to the file picker
  const pickedFor = useRef<number | null>(null);
  useEffect(() => {
    if (open && attach && !files.length && pickedFor.current !== attach.id) {
      pickedFor.current = attach.id;
      setTimeout(() => input.current?.click(), 250);
    }
    if (!open) pickedFor.current = null;
  }, [open, attach, files.length]);

  useEffect(() => {
    if (open && owner && !tg) void useOwner.getState().refreshTg();
  }, [open, owner, tg]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, close]);

  // drop audio files anywhere on the page to upload them
  useEffect(() => {
    if (!owner) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setGlobalDrag(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      if (--depth <= 0) {
        depth = 0;
        setGlobalDrag(false);
      }
    };
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setGlobalDrag(false);
      const fl = [...(e.dataTransfer?.files ?? [])];
      if (!fl.length) return;
      if (!useOwner.getState().dialog.open) useOwner.getState().openUpload(null, fl);
      else add(fl);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [owner, add]);

  const runQueue = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    let done = 0;
    try {
      for (;;) {
        const it = itemsRef.current.find((x) => x.status === 'ready' && x.queued);
        if (!it) break;
        update(it.uid, { status: 'uploading', progress: 0, error: '' });
        try {
          const r = await send(
            it,
            (p) => update(it.uid, { progress: p, status: p >= 0.999 ? 'saving' : 'uploading' }),
            (x) => xhrs.current.set(it.uid, x),
          );
          if (r.song) prime([r.song]);
          update(it.uid, { status: 'done', progress: 1, result: r.song, queued: false });
          done++;
          await useOwner.getState().refreshUploads();
        } catch (e) {
          update(it.uid, { status: 'error', error: (e as Error).message, queued: false });
        } finally {
          xhrs.current.delete(it.uid);
        }
      }
    } finally {
      running.current = false;
    }
    if (done) toast(done === 1 ? 'Uploaded to Telegram. It plays in full now.' : `${done} songs uploaded to Telegram.`);
    void useOwner.getState().refreshTg();
  }, [update]);

  const queueable = items.filter((x) => x.status === 'ready' || x.status === 'error');
  const active = items.filter((x) => x.status === 'uploading' || x.status === 'saving' || (x.status === 'ready' && x.queued));
  const uploading = active.length > 0;
  const connected = !!tg?.connected;
  const startAll = () => {
    setItems((l) => l.map((x) => (x.status === 'ready' || x.status === 'error' ? { ...x, status: 'ready', queued: true, error: '' } : x)));
    setTimeout(() => void runQueue(), 0);
  };
  const remove = (uid: string) => {
    xhrs.current.get(uid)?.abort();
    setItems((l) => {
      const it = l.find((x) => x.uid === uid);
      if (it?.coverUrl) URL.revokeObjectURL(it.coverUrl);
      return l.filter((x) => x.uid !== uid);
    });
  };
  const clearDone = () => setItems((l) => l.filter((x) => x.status !== 'done'));
  const totalBytes = queueable.reduce((n, x) => n + x.file.size, 0);
  const overall = active.length ? active.reduce((n, x) => n + (x.status === 'saving' ? 1 : x.progress), 0) / active.length : 0;

  return (
    <>
      <AnimatePresence>
        {globalDrag && !open && (
          <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-[90] grid place-items-center bg-black/70 p-6 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} className="grid place-items-center gap-3 rounded-2xl border-2 border-dashed border-white/60 px-14 py-12 text-center">
              <IconUpload size={44} />
              <div className="text-2xl font-black">Drop to upload</div>
              <div className="text-sub">Songs go straight to your Telegram channel</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* uploads keep running with the dialog closed: a small pill shows how far they are */}
      <AnimatePresence>
        {!open && uploading && (
          <motion.button
            key="pill"
            type="button"
            onClick={() => useOwner.getState().openUpload()}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed right-4 bottom-[calc(var(--tabs-h)+var(--bar-h)+80px)] z-[60] flex items-center gap-3 overflow-hidden rounded-full bg-[#282828] py-2 pr-4 pl-3 text-[13px] font-bold shadow-2xl md:bottom-[calc(var(--bar-h)+20px)]"
          >
            <IconUpload size={18} className="text-accent-hi" />
            Uploading {active.length} song{active.length === 1 ? '' : 's'} · {Math.round(overall * 100)}%
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent transition-[width] duration-300" style={{ width: `${overall * 100}%` }} />
          </motion.button>
        )}
      </AnimatePresence>

      <input
        ref={input}
        type="file"
        multiple={!attach}
        accept="audio/*,.mp3,.m4a,.aac,.flac,.wav,.ogg,.opus,.webm"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) add(e.target.files, attach);
          e.target.value = '';
        }}
      />

      <AnimatePresence>
        {open && (
          <motion.div key="dlg" className="fixed inset-0 z-[85] grid place-items-center bg-black/70 p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Upload songs"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="flex h-dvh w-full max-w-[760px] flex-col overflow-hidden bg-[#1f1f1f] shadow-2xl sm:h-auto sm:max-h-[88dvh] sm:rounded-xl"
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('Files')) {
                  e.preventDefault();
                  setDrag(true);
                }
              }}
              onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDrag(false);
                if (connected || !owner) add(e.dataTransfer.files, attach);
              }}
            >
              <div className="relative shrink-0 overflow-hidden px-6 pt-6 pb-4">
                <div className="absolute inset-0 bg-gradient-to-b from-accent/35 to-transparent" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[12px] font-bold tracking-wider text-white/70 uppercase">{attach ? 'Upload audio for' : 'Your archive'}</div>
                    <h2 className="mt-1 text-[clamp(24px,4vw,32px)] leading-tight font-black tracking-tight">{attach ? attach.t : 'Upload songs'}</h2>
                    <p className="mt-1 text-[14px] text-white/75">{attach ? `${attach.an}${attach.y ? ' · ' + attach.y : ''} · the file plays in place of the other players` : 'Files go straight to your Telegram channel and play in full, right here.'}</p>
                  </div>
                  <button type="button" aria-label="Close" onClick={close} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/30 text-white/80 hover:bg-black/50 hover:text-white">
                    <IconClose size={18} />
                  </button>
                </div>
              </div>

              <div className="scroll-y min-h-0 flex-1 px-6 pb-4">
                {!owner ? (
                  <div className="mx-auto max-w-sm py-6">
                    <p className="mb-5 text-center text-[14px] text-sub">Only the site owner can upload songs.</p>
                    <OwnerSignIn />
                  </div>
                ) : (
                  <>
                    <TelegramConnect compact />

                    <motion.button
                      type="button"
                      disabled={!connected}
                      onClick={() => input.current?.click()}
                      animate={{ scale: drag ? 1.015 : 1 }}
                      className={cx(
                        'mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 text-center transition-colors',
                        items.length ? 'py-5' : 'py-12',
                        drag ? 'border-accent bg-accent/10' : 'border-white/20 hover:border-white/50 hover:bg-white/[.03]',
                        !connected && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <span className={cx('grid place-items-center rounded-full bg-white/10', items.length ? 'h-10 w-10' : 'h-14 w-14')}>
                        <IconUpload size={items.length ? 20 : 28} />
                      </span>
                      <span className="text-[16px] font-bold">{drag ? 'Drop to add' : attach ? 'Choose the audio file' : items.length ? 'Add more songs' : 'Drag audio files here'}</span>
                      {!items.length && !attach && <span className="text-[13px] text-sub">or click to choose · MP3, M4A, FLAC, WAV, OGG, Opus · up to 2 GB each</span>}
                    </motion.button>

                    <motion.ul layout className="mt-3 flex flex-col gap-1.5">
                      <AnimatePresence initial={false}>
                        {items.map((it) => (
                          <Row key={it.uid} it={it} langs={langs} onChange={(p) => update(it.uid, p)} onRemove={() => remove(it.uid)} onClose={close} />
                        ))}
                      </AnimatePresence>
                    </motion.ul>
                  </>
                )}
              </div>

              {owner && items.length > 0 && (
                <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-white/10 bg-[#181818] px-6 py-4">
                  <div className="min-w-0 flex-1 text-[13px] text-sub">
                    {uploading
                      ? `Uploading… ${Math.round(overall * 100)}% · you can close this, uploads keep going`
                      : queueable.length
                        ? `${queueable.length} song${queueable.length === 1 ? '' : 's'} · ${fmtBytes(totalBytes)}`
                        : 'All done.'}
                    {items.some((x) => x.status === 'done') && !uploading && (
                      <>
                        {' · '}
                        <button type="button" onClick={clearDone} className="font-semibold text-white/80 hover:text-white hover:underline">
                          Clear finished
                        </button>
                        {' · '}
                        <Link href="/uploads" onClick={close} className="font-semibold text-white/80 hover:text-white hover:underline">
                          See all uploads
                        </Link>
                      </>
                    )}
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    disabled={!connected || uploading || !queueable.length || queueable.some((x) => x.status === 'reading')}
                    onClick={startAll}
                    className="h-12 rounded-full bg-accent px-8 text-[15px] font-bold text-white shadow-lg disabled:opacity-40"
                  >
                    {uploading ? 'Uploading…' : queueable.length > 1 ? `Upload ${queueable.length} songs` : 'Upload'}
                  </motion.button>
                </div>
              )}
              {!auth && owner && (
                <div className="shrink-0 bg-[#181818] px-6 pb-3 text-[11px] text-dim">Upload sign-in is off: anyone who can open this site can upload. Set OWNER_PASSWORD in web/.env.local to require a password.</div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const small = 'h-9 w-full rounded-md bg-white/[.08] px-2.5 text-[13px] text-white outline-none placeholder:text-dim focus:bg-white/[.12] focus:ring-1 focus:ring-white/40';

function Row({ it, langs, onChange, onRemove, onClose }: { it: Item; langs: string[]; onChange: (p: Partial<Item>) => void; onRemove: () => void; onClose: () => void }) {
  const target = it.match === 'new' ? null : it.matches.find((s) => s.id === it.match) ?? null;
  const replaces = !!target && !!withTg(target).tg;
  const busy = it.status === 'uploading' || it.status === 'saving';
  const editable = it.status === 'ready' || it.status === 'error';
  const art = target?.img && !it.coverUrl ? target.img : it.coverUrl || target?.img || '';
  const pickCover = useRef<HTMLInputElement>(null);
  const d = it.details;
  const setD = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ details: { ...d, [k]: e.target.value } });

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={cx('relative overflow-hidden rounded-lg', it.status === 'done' ? 'bg-[#7fd08a]/[.07]' : 'bg-white/[.04] hover:bg-white/[.06]')}
    >
      <div className="flex items-center gap-3 p-2.5">
        <button
          type="button"
          title={editable ? 'Choose cover art' : undefined}
          disabled={!editable}
          onClick={() => pickCover.current?.click()}
          className="group relative h-14 w-14 shrink-0 overflow-hidden rounded"
        >
          <Cover src={art} name={it.title} rounded="rounded" textSize="text-[8px]" />
          {editable && (
            <span className="absolute inset-0 grid place-items-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              <IconPhoto size={18} />
            </span>
          )}
        </button>
        <input
          ref={pickCover}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            const jpg = await squareJpeg(f);
            if (!jpg) return toast('That picture couldn’t be read.');
            if (it.coverUrl) URL.revokeObjectURL(it.coverUrl);
            onChange({ cover: jpg, coverUrl: URL.createObjectURL(jpg) });
          }}
        />

        <div className="min-w-0 flex-1">
          {it.status === 'reading' ? (
            <>
              <div className="truncate text-[15px] font-semibold">{it.title}</div>
              <div className="mt-1.5 h-3 w-40 rounded shimmer" />
            </>
          ) : (
            <>
              {target || !editable ? (
                <div className="truncate text-[15px] font-semibold">{target ? target.t : it.title}</div>
              ) : (
                <input value={it.title} onChange={(e) => onChange({ title: e.target.value })} aria-label="Song title" className="-ml-1 h-7 w-full rounded bg-transparent px-1 text-[15px] font-semibold outline-none hover:bg-white/[.06] focus:bg-white/10" />
              )}
              <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[12px] text-sub">
                {it.fixed || !editable ? (
                  <span className="truncate">{target ? `${target.an}${target.y ? ' · ' + target.y : ''}` : 'New song'}</span>
                ) : (
                  <label className="relative inline-flex min-w-0 items-center">
                    <span className="sr-only">Which song is this?</span>
                    <select
                      value={String(it.match)}
                      onChange={(e) => onChange({ match: e.target.value === 'new' ? 'new' : Number(e.target.value), open: e.target.value === 'new' ? it.open : false })}
                      className={cx('h-6 max-w-[min(420px,52vw)] cursor-pointer appearance-none truncate rounded-full pr-6 pl-2.5 text-[12px] font-semibold outline-none', target ? 'bg-white/10 text-white' : 'bg-muga/15 text-muga')}
                    >
                      {it.matches.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#282828] text-white">
                          {s.t} · {s.an}
                          {s.y ? ` (${s.y})` : ''}
                        </option>
                      ))}
                      <option value="new" className="bg-[#282828] text-white">
                        New song (not in the catalogue)
                      </option>
                    </select>
                    <IconChevronDown size={12} className="pointer-events-none absolute right-2" />
                  </label>
                )}
                <span className="shrink-0">
                  {it.duration ? mmss(it.duration) + ' · ' : ''}
                  {fmtBytes(it.file.size)}
                </span>
                {replaces && editable && <span className="shrink-0 text-muga">replaces its upload</span>}
              </div>
            </>
          )}
          {it.status === 'error' && <div className="mt-1 text-[12px] font-semibold text-accent-hi">{it.error}</div>}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {it.status === 'done' && it.result ? (
            <>
              <span className="hidden items-center gap-1 text-[12px] font-bold text-[#7fd08a] sm:flex">
                <IconCheckCircle size={16} /> In Telegram
              </span>
              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                aria-label={`Play ${it.result.t}`}
                onClick={() => {
                  const s = it.result!;
                  usePlayer.getState().playList([s.id], 0, { key: 'upload:' + s.id, label: s.t, href: '/uploads', img: s.img, kind: 'Upload' });
                  onClose();
                }}
                className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-accent text-white shadow-lg"
              >
                <IconPlay size={16} />
              </motion.button>
            </>
          ) : busy ? (
            <span className="tabular w-[92px] text-right text-[12px] font-bold text-white/80">{it.status === 'saving' ? 'Saving to Telegram…' : `${Math.round(it.progress * 100)}%`}</span>
          ) : (
            target === null &&
            editable && (
              <button type="button" onClick={() => onChange({ open: !it.open })} className="rounded-full px-2.5 py-1 text-[12px] font-bold text-sub hover:bg-white/10 hover:text-white">
                {it.open ? 'Hide details' : 'Details'}
              </button>
            )
          )}
          {it.status !== 'done' && (
            <button type="button" aria-label={busy ? 'Cancel upload' : 'Remove'} title={busy ? 'Cancel upload' : 'Remove'} onClick={onRemove} className="grid h-8 w-8 place-items-center rounded-full text-sub hover:bg-white/10 hover:text-white">
              <IconClose size={15} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {it.open && target === null && editable && (
          <motion.div key="d" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-2 gap-2 px-2.5 pb-3 sm:grid-cols-3">
              <input className={small + ' col-span-2'} value={d.an} onChange={setD('an')} placeholder="Album or film" aria-label="Album or film" />
              <input className={small} value={d.y} onChange={setD('y')} placeholder="Year" inputMode="numeric" aria-label="Year" />
              <select className={small + ' cursor-pointer'} value={d.l} onChange={setD('l')} aria-label="Language">
                {(langs.length ? langs : ['Assamese']).map((l) => (
                  <option key={l} value={l} className="bg-[#282828]">
                    {l}
                  </option>
                ))}
              </select>
              <input className={small + ' col-span-1 sm:col-span-2'} value={d.c} onChange={setD('c')} placeholder="With (co-singers)" aria-label="Co-singers" />
              <input className={small} value={d.m} onChange={setD('m')} placeholder="Music" aria-label="Music director" />
              <input className={small} value={d.w} onChange={setD('w')} placeholder="Lyrics" aria-label="Lyricist" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(busy || it.status === 'done') && (
        <motion.span
          className={cx('absolute bottom-0 left-0 h-[3px]', it.status === 'done' ? 'bg-[#7fd08a]' : 'bg-accent')}
          initial={false}
          animate={{ width: `${(it.status === 'saving' || it.status === 'done' ? 1 : it.progress) * 100}%`, opacity: it.status === 'done' ? 0 : 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 24, opacity: { delay: 0.8 } }}
        />
      )}
      {it.status === 'saving' && <span className="shimmer absolute inset-x-0 bottom-0 h-[3px] opacity-60" />}
    </motion.li>
  );
}
