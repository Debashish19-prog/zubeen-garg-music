import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Song } from '@/lib/types';
import { DB, applyUploads, songAt, songDTO, songsDTO } from './catalog';
import { decodeCaption, encodeCaption, mutateUploads, uploadByKey, uploadsSnapshot, streamUrl, UPLOAD_BASE, type UploadRec } from './uploadStore';
import { ByteReader, TgError, channelMessages, deleteMessages, editCaption, photoBytes, sendAudio, sendCover, storageChannel } from './telegram';

/** What the browser sends in the X-Upload-Meta header (base64url JSON) along with the file. */
export interface UploadMeta {
  fileName: string;
  mime: string;
  /** bytes of audio, after the cover */
  size: number;
  /** bytes of JPEG cover art at the start of the body (0 = none) */
  coverSize: number;
  duration: number;
  /** attach to this catalogue song instead of adding a new one */
  attach?: number;
  t?: string;
  an?: string;
  l?: string;
  y?: number;
  c?: string;
  m?: string;
  w?: string;
}

const MAX_AUDIO = 4000 * 512 * 1024; // Telegram's 2 GB limit for accounts without Premium
const MAX_COVER = 3 * 1024 * 1024;
const AUDIO_EXT = /\.(mp3|m4a|m4b|aac|flac|wav|ogg|oga|opus|weba|webm|mp4|aif|aiff|alac|wma)$/i;
const str = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

export function parseMeta(header: string | null): UploadMeta {
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(Buffer.from(header || '', 'base64url').toString('utf8'));
  } catch {
    throw new TgError('Missing upload details.', 400);
  }
  const fileName = str(o.fileName, 200).replace(/[\\/:*?"<>|]+/g, '_') || 'song.mp3';
  const mime = str(o.mime, 80) || 'audio/mpeg';
  if (!mime.startsWith('audio/') && !AUDIO_EXT.test(fileName)) throw new TgError('Only audio files can be uploaded.', 415);
  const size = Number(o.size), coverSize = Number(o.coverSize) || 0;
  if (!Number.isInteger(size) || size <= 0) throw new TgError('The file is empty.', 400);
  if (size > MAX_AUDIO) throw new TgError('Telegram stores files up to 2 GB.', 413);
  if (!Number.isInteger(coverSize) || coverSize < 0 || coverSize > MAX_COVER) throw new TgError('The cover picture is too large.', 413);
  const attach = o.attach === undefined || o.attach === null ? undefined : Number(o.attach);
  if (attach !== undefined && !(Number.isInteger(attach) && DB.songs[attach])) throw new TgError('That catalogue song doesn’t exist.', 400);
  const l = str(o.l, 40);
  return {
    fileName,
    mime: mime.startsWith('audio/') ? mime : 'audio/mpeg',
    size,
    coverSize,
    duration: Math.max(0, Math.min(36000, Number(o.duration) || 0)),
    attach,
    t: str(o.t, 160),
    an: str(o.an, 160),
    l: DB.langOrder.includes(l) ? l : 'Unspecified',
    y: Math.max(0, Math.min(2100, Math.round(Number(o.y) || 0))),
    c: str(o.c, 200),
    m: str(o.m, 200),
    w: str(o.w, 200),
  };
}

/* ------------------------------------------------------------------ cover art cache (Telegram is the source) */

const COVERS = path.join(process.cwd(), 'data', 'covers');
const coverFile = (key: string) => path.join(COVERS, key.replace(/[^A-Za-z0-9_-]/g, '') + '.jpg');

export async function coverBytes(key: string): Promise<Buffer> {
  const rec = uploadByKey(key);
  if (!rec?.coverMsgId) throw new TgError('No cover for this song.', 404);
  try {
    return await fs.promises.readFile(coverFile(key));
  } catch {
    const b = await photoBytes(rec.coverMsgId);
    await fs.promises.mkdir(COVERS, { recursive: true });
    await fs.promises.writeFile(coverFile(key), b).catch(() => undefined);
    return b;
  }
}

/* ------------------------------------------------------------------ create / edit / remove */

function labels(r: UploadRec) {
  const s = r.cat ? DB.songs[r.id] : undefined;
  return { title: s ? s.t : r.t || r.fileName, album: s ? (s.a >= 0 ? DB.albums[s.a].n : '') : r.an || '' };
}

/**
 * Streams the request body to Telegram: cover art first (if any), then the audio. Nothing is
 * written to the server's disk except the small cover cache. A catalogue song that already had a
 * file gets the new one, and the old Telegram messages are deleted.
 */
export async function createUpload(body: ReadableStream<Uint8Array>, meta: UploadMeta): Promise<{ rec: UploadRec; song: Song | null }> {
  await storageChannel(); // fails fast (409) when Telegram isn't connected, before any id is used
  const src = new ByteReader(body.getReader());
  const key = crypto.randomBytes(9).toString('base64url');
  const id = meta.attach ?? (await mutateUploads((s) => s.next++));
  const base: UploadRec = {
    key,
    id,
    cat: meta.attach !== undefined,
    msgId: 0,
    size: meta.size,
    mime: meta.mime,
    fileName: meta.fileName,
    d: meta.duration,
    at: Date.now(),
    ...(meta.attach === undefined ? { t: meta.t || meta.fileName.replace(/\.[a-z0-9]+$/i, ''), an: meta.an, l: meta.l, y: meta.y, c: meta.c, m: meta.m, w: meta.w } : {}),
  };

  let coverMsgId: number | undefined;
  if (meta.coverSize) {
    const cover = await src.read(meta.coverSize);
    if (cover.length !== meta.coverSize) throw new TgError('The upload was cut short. Try again.', 400);
    coverMsgId = await sendCover(cover, `🖼 Cover art\n#zubeen-cover ${key}`);
    await fs.promises.mkdir(COVERS, { recursive: true });
    await fs.promises.writeFile(coverFile(key), cover).catch(() => undefined);
  }
  base.coverMsgId = coverMsgId;
  const { title, album } = labels(base);

  let sent;
  try {
    sent = await sendAudio({
      src,
      size: meta.size,
      fileName: meta.fileName,
      mime: meta.mime,
      duration: meta.duration,
      title,
      performer: 'Zubeen Garg' + (meta.attach === undefined ? (meta.c ? ', ' + meta.c : '') : DB.songs[id].c ? ', ' + DB.songs[id].c : ''),
      caption: encodeCaption(base, title, album),
    });
  } catch (e) {
    if (coverMsgId) await deleteMessages([coverMsgId]).catch(() => undefined);
    await fs.promises.rm(coverFile(key), { force: true });
    throw e;
  }

  const rec: UploadRec = { ...base, msgId: sent.msgId, size: sent.size, mime: sent.mime };
  const replaced = await mutateUploads((s) => {
    const old = rec.cat ? s.items.filter((r) => r.cat && r.id === rec.id) : [];
    s.items = s.items.filter((r) => !old.includes(r));
    s.items.push(rec);
    return old;
  });
  applyUploads();
  for (const o of replaced) await dropTelegram(o);
  return { rec, song: songDTO(rec.id) };
}

async function dropTelegram(r: UploadRec) {
  await deleteMessages([r.msgId, r.coverMsgId].filter((x): x is number => !!x)).catch((e) => console.warn('[zubeen] could not delete Telegram messages', (e as Error).message));
  await fs.promises.rm(coverFile(r.key), { force: true });
}

export interface UploadPatch {
  t?: string;
  an?: string;
  l?: string;
  y?: number;
  c?: string;
  m?: string;
  w?: string;
}

/** Edits the details of an uploaded song that isn't in the catalogue (and its Telegram caption). */
export async function updateUpload(key: string, p: UploadPatch): Promise<Song | null> {
  const rec = await mutateUploads((s) => {
    const r = s.items.find((x) => x.key === key);
    if (!r) throw new TgError('Upload not found.', 404);
    if (r.cat) throw new TgError('This file belongs to a catalogue song; its details come from the catalogue.', 400);
    if (p.t !== undefined) r.t = str(p.t, 160) || r.t;
    if (p.an !== undefined) r.an = str(p.an, 160);
    if (p.l !== undefined) r.l = DB.langOrder.includes(p.l) ? p.l : 'Unspecified';
    if (p.y !== undefined) r.y = Math.max(0, Math.min(2100, Math.round(Number(p.y) || 0)));
    if (p.c !== undefined) r.c = str(p.c, 200);
    if (p.m !== undefined) r.m = str(p.m, 200);
    if (p.w !== undefined) r.w = str(p.w, 200);
    return { ...r };
  });
  applyUploads();
  const { title, album } = labels(rec);
  await editCaption(rec.msgId, encodeCaption(rec, title, album)).catch((e) => console.warn('[zubeen] caption not updated', (e as Error).message));
  return songDTO(rec.id);
}

/** Removes the song from the site and deletes its messages from the Telegram channel. */
export async function removeUpload(key: string) {
  const rec = await mutateUploads((s) => {
    const r = s.items.find((x) => x.key === key);
    if (!r) throw new TgError('Upload not found.', 404);
    s.items = s.items.filter((x) => x !== r);
    return r;
  });
  applyUploads();
  await dropTelegram(rec);
}

/** Rebuilds the index from the channel's captions: adds songs missing here, drops ones deleted in Telegram. */
export async function resyncFromTelegram() {
  const found = new Map<string, UploadRec>();
  for await (const m of channelMessages()) {
    if (!m.doc) continue;
    const meta = decodeCaption(m.caption);
    if (!meta?.key || !Number.isInteger(meta.id)) continue;
    const cat = !!meta.cat;
    if (cat && !DB.songs[meta.id!]) continue;
    const fileAttr = m.doc.attributes.find((a) => 'fileName' in a) as { fileName?: string } | undefined;
    found.set(meta.key, {
      key: meta.key,
      id: meta.id!,
      cat,
      msgId: m.id,
      coverMsgId: meta.cv,
      size: m.doc.size.toJSNumber(),
      mime: m.doc.mimeType || 'audio/mpeg',
      fileName: fileAttr?.fileName || 'song.mp3',
      d: meta.d || 0,
      at: m.date,
      ...(cat ? {} : { t: meta.t, an: meta.an, l: meta.l, y: meta.y, c: meta.c, m: meta.m, w: meta.w }),
    });
  }
  const res = await mutateUploads((s) => {
    const before = new Set(s.items.map((r) => r.key));
    const added = [...found.keys()].filter((k) => !before.has(k)).length;
    const removed = [...before].filter((k) => !found.has(k)).length;
    // newest wins when one catalogue song has several files
    const byCat = new Map<number, UploadRec>();
    const items: UploadRec[] = [];
    for (const r of [...found.values()].sort((a, b) => b.at - a.at)) {
      if (r.cat) {
        if (byCat.has(r.id)) continue;
        byCat.set(r.id, r);
      }
      items.push(r);
    }
    s.items = items;
    s.next = Math.max(s.next, ...items.filter((r) => !r.cat).map((r) => r.id + 1), UPLOAD_BASE);
    return { added, removed, total: items.length };
  });
  applyUploads();
  return res;
}

/* ------------------------------------------------------------------ what listeners see */

/** Every upload, newest first: which catalogue songs now play from the archive, plus the songs that aren't in the catalogue. */
export function publicUploads() {
  const tg: Record<number, string> = {};
  for (const r of uploadsSnapshot()) if (r.cat && songAt(r.id)?.tg) tg[r.id] = streamUrl(r);
  return { ids: DB.uploadIds, tg, songs: songsDTO([...DB.extras.keys()]) };
}

/** The owner's view: the records, with the song each one plays as. */
export function ownerUploads() {
  return [...uploadsSnapshot()]
    .sort((a, b) => b.at - a.at)
    .map((r) => ({ key: r.key, id: r.id, cat: r.cat, size: r.size, mime: r.mime, fileName: r.fileName, d: r.d, at: r.at, song: songDTO(r.id) }));
}
