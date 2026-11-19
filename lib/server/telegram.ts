import fs from 'node:fs';
import path from 'node:path';
import bigInt from 'big-integer';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { LogLevel } from 'telegram/extensions/Logger';
import { computeCheck } from 'telegram/Password';
import { generateRandomLong } from 'telegram/Helpers';

/**
 * Telegram is the storage for uploaded songs. The server signs in to the owner's Telegram
 * account over MTProto (GramJS) with the app credentials in .env.local, keeps one private
 * broadcast channel, and stores every song as one audio message in it. Listeners never talk to
 * Telegram: /api/stream pulls the bytes through this module.
 *
 * data/telegram.json holds the session string and the channel. Anyone who can read that file
 * can use the Telegram account, so it stays out of version control (see .gitignore).
 */

const FILE = path.join(process.cwd(), 'data', 'telegram.json');
export const CHANNEL_TITLE = 'Zubeen · Uploaded Songs';
const MARK = 'zubeen-site-storage-v1';

export interface StorageChannel {
  id: string;
  accessHash: string;
  title: string;
}
interface Saved {
  session: string;
  channel?: StorageChannel;
  me?: { name: string; username?: string };
}
interface LoginState {
  phone: string;
  phoneCodeHash: string;
  viaApp: boolean;
  step: 'code' | 'password';
  hint?: string;
}
interface TG {
  saved: Saved;
  client?: TelegramClient;
  connecting?: Promise<TelegramClient>;
  authorized?: boolean;
  login?: LoginState;
  channelP?: Promise<StorageChannel>;
}

const g = globalThis as unknown as { __zgTG?: TG };
const S: TG = (g.__zgTG ??= { saved: readSaved() });

function readSaved(): Saved {
  try {
    return { session: '', ...(JSON.parse(fs.readFileSync(FILE, 'utf8')) as Partial<Saved>) };
  } catch {
    return { session: '' };
  }
}
function persist() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(S.saved, null, 1), { mode: 0o600 });
  fs.renameSync(tmp, FILE);
}

export function apiCreds(): { apiId: number; apiHash: string } | null {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = String(process.env.TELEGRAM_API_HASH || '');
  return apiId && /^[0-9a-f]{32}$/i.test(apiHash) ? { apiId, apiHash } : null;
}

/* ------------------------------------------------------------------ connection */

async function connect(): Promise<TelegramClient> {
  if (S.client) return S.client;
  if (S.connecting) return S.connecting;
  const creds = apiCreds();
  if (!creds) throw new TgError('Telegram isn’t set up: add TELEGRAM_API_ID and TELEGRAM_API_HASH to web/.env.local.', 503);
  S.connecting = (async () => {
    const c = new TelegramClient(new StringSession(S.saved.session || ''), creds.apiId, creds.apiHash, {
      connectionRetries: 5,
      deviceModel: 'Zubeen site server',
      systemVersion: `Node ${process.version}`,
      appVersion: '2.0.0',
      langCode: 'en',
      systemLangCode: 'en',
    });
    c.setLogLevel(LogLevel.ERROR);
    await c.connect();
    S.client = c;
    return c;
  })();
  try {
    return await S.connecting;
  } finally {
    S.connecting = undefined;
  }
}

export class TgError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

/** The signed-in client, or a 409 error the upload dialog turns into the sign-in steps. */
async function authed(): Promise<TelegramClient> {
  const c = await connect();
  if (S.authorized === undefined) S.authorized = !!S.saved.session && (await c.checkAuthorization().catch(() => false));
  if (!S.authorized) throw new TgError('Connect your Telegram account first.', 409);
  return c;
}

export async function tgStatus() {
  const configured = !!apiCreds();
  let connected = false;
  let error = '';
  if (configured && S.saved.session) {
    try {
      await authed();
      connected = true;
    } catch (e) {
      error = (e as Error).message;
    }
  }
  return {
    configured,
    connected,
    error: connected ? '' : error,
    me: connected ? S.saved.me ?? null : null,
    channel: connected ? S.saved.channel?.title ?? null : null,
    login: !connected && S.login ? { step: S.login.step, phone: S.login.phone, hint: S.login.hint || '', viaApp: S.login.viaApp } : null,
  };
}

/* ------------------------------------------------------------------ sign-in (phone -> code -> 2FA password) */

const errMsg = (e: unknown) => (e as { errorMessage?: string }).errorMessage || (e as Error).message || String(e);

function friendly(e: unknown): TgError {
  const m = errMsg(e);
  const map: Record<string, string> = {
    PHONE_NUMBER_INVALID: 'Telegram doesn’t recognise that phone number. Include the country code, like +91…',
    PHONE_NUMBER_BANNED: 'Telegram has banned this phone number.',
    PHONE_CODE_INVALID: 'That code isn’t right. Check the latest message from Telegram.',
    PHONE_CODE_EXPIRED: 'That code has expired. Start again to get a new one.',
    PASSWORD_HASH_INVALID: 'That isn’t your Telegram two-step verification password.',
    API_ID_INVALID: 'Telegram rejected the API id and hash in .env.local.',
  };
  if (/FLOOD_WAIT_(\d+)|A wait of (\d+) seconds/.test(m)) {
    const s = Number(RegExp.$1 || RegExp.$2);
    return new TgError(`Telegram asks us to wait ${s > 90 ? Math.ceil(s / 60) + ' minutes' : s + ' seconds'} before trying again.`, 429);
  }
  return new TgError(map[m] || m, map[m] ? 400 : 500);
}

async function finishLogin(c: TelegramClient) {
  S.login = undefined;
  S.authorized = true;
  const me = (await c.getMe()) as Api.User;
  S.saved = {
    session: (c.session as StringSession).save(),
    me: { name: [me.firstName, me.lastName].filter(Boolean).join(' ') || me.username || 'Telegram user', username: me.username || undefined },
  };
  persist();
}

export async function sendLoginCode(phone: string) {
  const creds = apiCreds();
  if (!creds) throw new TgError('Telegram isn’t set up.', 503);
  phone = phone.replace(/[^\d+]/g, '');
  if (!/^\+?\d{7,15}$/.test(phone)) throw new TgError('Enter your phone number with the country code, like +91 98xxxxxxx.', 400);
  const c = await connect();
  try {
    const r = await c.sendCode(creds, phone);
    S.login = { phone, phoneCodeHash: r.phoneCodeHash, viaApp: r.isCodeViaApp, step: 'code' };
  } catch (e) {
    throw friendly(e);
  }
}

export async function submitLoginCode(code: string) {
  const L = S.login;
  if (!L || L.step !== 'code') throw new TgError('Start again with your phone number.', 400);
  const c = await connect();
  try {
    const r = await c.invoke(new Api.auth.SignIn({ phoneNumber: L.phone, phoneCodeHash: L.phoneCodeHash, phoneCode: code.replace(/\D/g, '') }));
    if (r instanceof Api.auth.AuthorizationSignUpRequired) {
      S.login = undefined;
      throw new TgError('There is no Telegram account for this number yet. Create one in the Telegram app first.', 400);
    }
    await finishLogin(c);
  } catch (e) {
    if (errMsg(e) === 'SESSION_PASSWORD_NEEDED') {
      const pw = await c.invoke(new Api.account.GetPassword());
      S.login = { ...L, step: 'password', hint: pw.hint || '' };
      return;
    }
    if (e instanceof TgError) throw e;
    throw friendly(e);
  }
}

export async function submitLoginPassword(password: string) {
  const L = S.login;
  if (!L || L.step !== 'password') throw new TgError('Start again with your phone number.', 400);
  const c = await connect();
  try {
    const pw = await c.invoke(new Api.account.GetPassword());
    await c.invoke(new Api.auth.CheckPassword({ password: await computeCheck(pw, password) }));
    await finishLogin(c);
  } catch (e) {
    throw friendly(e);
  }
}

export function cancelLogin() {
  S.login = undefined;
}

/** Signs the server out of Telegram. The channel and the songs in it stay in the account. */
export async function tgSignOut() {
  const c = S.client;
  try {
    if (c && S.authorized) await c.invoke(new Api.auth.LogOut());
  } catch {
    /* already signed out */
  }
  try {
    await c?.disconnect();
  } catch {
    /* ignore */
  }
  S.client = undefined;
  S.authorized = false;
  S.login = undefined;
  S.channelP = undefined;
  S.saved = { session: '' };
  persist();
  docs.clear();
}

/* ------------------------------------------------------------------ the storage channel */

const peerOf = (ch: StorageChannel) => new Api.InputPeerChannel({ channelId: bigInt(ch.id), accessHash: bigInt(ch.accessHash) });
const toStorage = (c: Api.Channel): StorageChannel => ({ id: c.id.toString(), accessHash: (c.accessHash ?? bigInt.zero).toString(), title: c.title });

async function findOrCreateChannel(c: TelegramClient): Promise<StorageChannel> {
  const cached = S.saved.channel;
  if (cached) {
    try {
      const res = await c.invoke(new Api.channels.GetChannels({ id: [new Api.InputChannel({ channelId: bigInt(cached.id), accessHash: bigInt(cached.accessHash) })] }));
      const ch = res.chats[0];
      if (ch instanceof Api.Channel && !ch.left) return toStorage(ch);
    } catch {
      /* deleted or left: look again */
    }
  }
  for await (const d of c.iterDialogs({})) {
    const e = d.entity;
    if (!(e instanceof Api.Channel) || !e.creator || !e.broadcast) continue;
    const full = await c.invoke(new Api.channels.GetFullChannel({ channel: e }));
    if (full.fullChat instanceof Api.ChannelFull && full.fullChat.about.includes(MARK)) return toStorage(e);
  }
  const created = await c.invoke(
    new Api.channels.CreateChannel({
      title: CHANNEL_TITLE,
      about: `Songs uploaded to the Zubeen fan site. The site plays them from here, so please don't delete or edit these messages. ${MARK}`,
      broadcast: true,
    }),
  );
  const chat = 'chats' in created ? created.chats.find((x): x is Api.Channel => x instanceof Api.Channel) : undefined;
  if (!chat) throw new TgError('Telegram didn’t return the new channel.');
  return toStorage(chat);
}

export async function storageChannel(): Promise<StorageChannel> {
  const c = await authed();
  if (S.saved.channel && S.channelP) return S.channelP;
  S.channelP = findOrCreateChannel(c).then((ch) => {
    S.saved.channel = ch;
    persist();
    return ch;
  });
  S.channelP.catch(() => (S.channelP = undefined));
  return S.channelP;
}

/* ------------------------------------------------------------------ uploading */

async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const m = errMsg(err);
      if (/FILE_PARTS_INVALID|FILE_PART_SIZE_INVALID|AUTH_KEY_UNREGISTERED|SESSION_REVOKED/.test(m)) break;
      const wait = (err as { seconds?: number }).seconds;
      if (wait && wait > 60) break;
      await new Promise((r) => setTimeout(r, wait ? wait * 1000 : 700 * (i + 1)));
    }
  }
  throw last;
}

/** Reads a web stream in exact-sized pieces. */
export class ByteReader {
  private buf: Buffer[] = [];
  private have = 0;
  private done = false;
  constructor(private reader: ReadableStreamDefaultReader<Uint8Array>) {}
  async read(n: number): Promise<Buffer> {
    while (this.have < n && !this.done) {
      const { value, done } = await this.reader.read();
      if (done) this.done = true;
      else if (value?.length) {
        this.buf.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
        this.have += value.length;
      }
    }
    const all = this.buf.length === 1 ? this.buf[0] : Buffer.concat(this.buf);
    const out = Buffer.from(all.subarray(0, Math.min(n, all.length)));
    const rest = all.subarray(out.length);
    this.buf = rest.length ? [rest] : [];
    this.have = rest.length;
    return out;
  }
}

const PART = 512 * 1024;
const BIG = 10 * 1024 * 1024;
const WORKERS = 4;

/**
 * Streams `size` bytes from the request body to Telegram in 512 KB parts, four in flight, so the
 * file never sits on the server's disk (and only a few parts are ever in memory).
 */
async function uploadParts(c: TelegramClient, src: ByteReader, size: number, name: string, onProgress?: (done: number) => void) {
  const big = size > BIG;
  const parts = Math.max(1, Math.ceil(size / PART));
  const fileId = generateRandomLong(true);
  const inflight = new Set<Promise<void>>();
  let failure: unknown = null;
  let sent = 0;
  for (let part = 0; part < parts; part++) {
    const want = part === parts - 1 ? size - part * PART : PART;
    const bytes = await src.read(want);
    if (bytes.length !== want) throw new TgError('The upload was cut short. Try again.', 400);
    const p = withRetry(() =>
      c.invoke(big ? new Api.upload.SaveBigFilePart({ fileId, filePart: part, fileTotalParts: parts, bytes }) : new Api.upload.SaveFilePart({ fileId, filePart: part, bytes })),
    )
      .then(() => onProgress?.((sent += bytes.length)))
      .catch((e) => void (failure ??= e))
      .finally(() => inflight.delete(p));
    inflight.add(p);
    if (inflight.size >= WORKERS) await Promise.race(inflight);
    if (failure) throw failure;
  }
  await Promise.all(inflight);
  if (failure) throw failure;
  return big ? new Api.InputFileBig({ id: fileId, parts, name }) : new Api.InputFile({ id: fileId, parts, name, md5Checksum: '' });
}

function sentMessage(c: TelegramClient, request: unknown, result: unknown, ch: StorageChannel): Api.Message {
  const msg = c._getResponseMessage(request, result, peerOf(ch));
  if (msg instanceof Api.Message) return msg;
  throw new TgError('Telegram didn’t confirm the upload.');
}

const docOf = (msg: Api.Message) => (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document ? msg.media.document : null);

export interface SentAudio {
  msgId: number;
  size: number;
  mime: string;
}

export async function sendAudio(o: {
  src: ByteReader;
  size: number;
  fileName: string;
  mime: string;
  duration: number;
  title: string;
  performer: string;
  caption: string;
  onProgress?: (done: number) => void;
}): Promise<SentAudio> {
  const c = await authed();
  const ch = await storageChannel();
  try {
    const file = await uploadParts(c, o.src, o.size, o.fileName, o.onProgress);
    const request = new Api.messages.SendMedia({
      peer: peerOf(ch),
      media: new Api.InputMediaUploadedDocument({
        file,
        mimeType: o.mime,
        attributes: [
          new Api.DocumentAttributeAudio({ duration: Math.round(o.duration || 0), title: o.title.slice(0, 120), performer: o.performer.slice(0, 120) }),
          new Api.DocumentAttributeFilename({ fileName: o.fileName }),
        ],
      }),
      message: o.caption,
      randomId: generateRandomLong(true),
    });
    const msg = sentMessage(c, request, await withRetry(() => c.invoke(request), 2), ch);
    const doc = docOf(msg);
    if (!doc) throw new TgError('Telegram stored the file, but not as audio.');
    docs.set(msg.id, { doc, at: Date.now() });
    return { msgId: msg.id, size: doc.size.toJSNumber(), mime: doc.mimeType || o.mime };
  } catch (e) {
    throw e instanceof TgError ? e : friendly(e);
  }
}

/** Uploads cover art as a photo message (Telegram keeps an 800 px copy plus smaller sizes). */
export async function sendCover(bytes: Buffer, caption: string): Promise<number> {
  const c = await authed();
  const ch = await storageChannel();
  const file = await uploadParts(c, new ByteReader(new Blob([new Uint8Array(bytes)]).stream().getReader()), bytes.length, 'cover.jpg');
  const request = new Api.messages.SendMedia({
    peer: peerOf(ch),
    media: new Api.InputMediaUploadedPhoto({ file }),
    message: caption,
    randomId: generateRandomLong(true),
  });
  return sentMessage(c, request, await withRetry(() => c.invoke(request), 2), ch).id;
}

export async function editCaption(msgId: number, caption: string) {
  const c = await authed();
  const ch = await storageChannel();
  try {
    await c.invoke(new Api.messages.EditMessage({ peer: peerOf(ch), id: msgId, message: caption }));
  } catch (e) {
    if (errMsg(e) !== 'MESSAGE_NOT_MODIFIED') throw friendly(e);
  }
}

export async function deleteMessages(ids: number[]) {
  if (!ids.length) return;
  const c = await authed();
  const ch = await storageChannel();
  await withRetry(() => c.deleteMessages(peerOf(ch), ids, { revoke: true }));
  ids.forEach((i) => docs.delete(i));
}

/** Every message in the channel, for rebuilding the index from Telegram. */
export async function* channelMessages(): AsyncGenerator<{ id: number; caption: string; date: number; doc: Api.Document | null; photo: boolean }> {
  const c = await authed();
  const ch = await storageChannel();
  for await (const m of c.iterMessages(peerOf(ch), { waitTime: 0 })) {
    if (!(m instanceof Api.Message)) continue;
    yield { id: m.id, caption: m.message || '', date: m.date * 1000, doc: docOf(m), photo: m.media instanceof Api.MessageMediaPhoto };
  }
}

/* ------------------------------------------------------------------ downloading */

const docs = new Map<number, { doc: Api.Document; at: number }>();

async function fetchMessage(msgId: number): Promise<Api.Message> {
  const c = await authed();
  const ch = await storageChannel();
  const [m] = await c.getMessages(peerOf(ch), { ids: [msgId] });
  if (!(m instanceof Api.Message)) throw new TgError('This song is no longer in the Telegram channel.', 404);
  return m;
}

/** The Telegram document behind a message. File references expire, so they are refreshed hourly. */
export async function audioDoc(msgId: number, fresh = false): Promise<Api.Document> {
  const hit = docs.get(msgId);
  if (hit && !fresh && Date.now() - hit.at < 3_600_000) return hit.doc;
  const doc = docOf(await fetchMessage(msgId));
  if (!doc) throw new TgError('This message has no audio file.', 404);
  docs.set(msgId, { doc, at: Date.now() });
  return doc;
}

export const BLOCK = 256 * 1024; // divides 1 MB, so a block never crosses Telegram's 1 MB boundary

/* finished blocks, so seeking back and replays don't go to Telegram again */
const blockCache = new Map<string, Buffer>();
let cacheBytes = 0;
const CACHE_MAX = 128 * 1024 * 1024;
const blockInflight = new Map<string, Promise<Buffer>>();

function remember(key: string, b: Buffer) {
  blockCache.set(key, b);
  cacheBytes += b.length;
  for (const [k, v] of blockCache) {
    if (cacheBytes <= CACHE_MAX) break;
    blockCache.delete(k);
    cacheBytes -= v.length;
  }
}

/** One 256 KB block of a file (the last one may be shorter). */
export function audioBlock(msgId: number, index: number): Promise<Buffer> {
  const key = msgId + ':' + index;
  const hit = blockCache.get(key);
  if (hit) {
    blockCache.delete(key); // move to the end: least recently used goes first
    blockCache.set(key, hit);
    return Promise.resolve(hit);
  }
  const running = blockInflight.get(key);
  if (running) return running;
  const p = (async () => {
    const c = await authed();
    for (let attempt = 0; ; attempt++) {
      const doc = await audioDoc(msgId, attempt > 0);
      try {
        const sender = await c.getSender(doc.dcId);
        const res = await c.invokeWithSender(
          new Api.upload.GetFile({
            location: new Api.InputDocumentFileLocation({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, thumbSize: '' }),
            offset: bigInt(index * BLOCK),
            limit: BLOCK,
            precise: true,
          }),
          sender,
        );
        if (!(res instanceof Api.upload.File)) throw new TgError('Telegram sent this file through a CDN, which isn’t supported.');
        const b = Buffer.from(res.bytes);
        remember(key, b);
        return b;
      } catch (e) {
        const m = errMsg(e);
        const wait = (e as { seconds?: number }).seconds;
        if (attempt < 3 && (/FILE_REFERENCE_|TIMEOUT|Not connected|disconnect/i.test(m) || (wait && wait <= 10))) {
          await new Promise((r) => setTimeout(r, wait ? wait * 1000 : 300));
          continue;
        }
        throw e;
      }
    }
  })().finally(() => blockInflight.delete(key));
  blockInflight.set(key, p);
  return p;
}

/** A photo message's 800 px (or largest) image. */
export async function photoBytes(msgId: number): Promise<Buffer> {
  const c = await authed();
  const m = await fetchMessage(msgId);
  if (!(m.media instanceof Api.MessageMediaPhoto) || !(m.media.photo instanceof Api.Photo)) throw new TgError('No picture in this message.', 404);
  const sizes = m.media.photo.sizes.filter((s): s is Api.PhotoSize | Api.PhotoSizeProgressive => s instanceof Api.PhotoSize || s instanceof Api.PhotoSizeProgressive);
  const best = sizes.filter((s) => s.w <= 800).sort((a, b) => b.w - a.w)[0] ?? sizes.sort((a, b) => a.w - b.w)[0];
  const out = await c.downloadMedia(m, best ? { thumb: best } : {});
  if (!out || typeof out === 'string') throw new TgError('Couldn’t download the cover.', 502);
  return Buffer.from(out);
}
