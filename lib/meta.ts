import photosJson from '@/data/photos.json';
import type { Song, SourceKey } from './types';

export interface Photo {
  id: string;
  src: string;
  w: number;
  h: number;
  caption: string;
  credit: string;
  url: string;
}
export const PHOTOS = photosJson as Photo[];
const P = Object.fromEntries(PHOTOS.map((p) => [p.id, p])) as Record<string, Photo>;
export const photo = (id: string) => P[id]?.src ?? '';

export const HERO_PHOTOS = ['stage-red', 'stage-purple', 'portrait-blue', 'stage-white', 'stage-band', 'stage-sky'].map((id) => P[id]).filter(Boolean);
export const ARTIST_AVATAR = photo('avatar');
export const ABOUT_PHOTO = photo('studio');

export const ARTIST = {
  name: 'Zubeen Garg',
  native: 'জুবিন গাৰ্গ',
  years: '1972 – 2025',
};

export interface CollectionMeta {
  key: string;
  name: string;
  blurb: string;
  photo: string;
  color: string;
  mix?: boolean;
}

/** Curated collections (filters over the catalogue) and generated mixes. */
export const COLLECTIONS: CollectionMeta[] = [
  { key: 'essentials', name: 'The Essentials', blurb: 'A starting point: the songs most people know him for.', photo: photo('stage-red'), color: '#7a1f1f' },
  { key: 'film', name: 'Film Songs', blurb: 'Songs he sang for Assamese, Hindi, Bengali and other films, as listed on Wikipedia.', photo: photo('studio'), color: '#5a4a3a' },
  { key: 'bihu', name: 'Bihu', blurb: 'Songs for Bohag and the Rongali Bihu stage.', photo: photo('gamosa'), color: '#8c2b22' },
  { key: 'devotional', name: 'Devotional', blurb: 'Borgeet, bhajans, naam and other devotional songs.', photo: photo('later-years'), color: '#4a4f3a' },
  { key: 'folk', name: 'Folk', blurb: 'Lokageet from Kamrup and Goalpara, tokari geet and other folk songs.', photo: photo('traditional'), color: '#2f4a5a' },
  { key: 'theatre', name: 'Mobile Theatre', blurb: "Songs written for Assam's travelling theatre troupes.", photo: photo('stage-stripes'), color: '#3d2a5c' },
  { key: 'tv', name: 'TV, Web & Theme Songs', blurb: 'Theme songs, serial title tracks and web series songs.', photo: photo('stage-hat'), color: '#3b2f6b' },
  { key: 'unplugged', name: 'Unplugged & Reprise', blurb: 'Stripped-back and reprised versions.', photo: photo('guitar-hat'), color: '#5c2a3d' },
  { key: 'remix', name: 'Remixes & Lofi', blurb: 'Remixes, DJ mixes and lofi edits released over the years.', photo: photo('stage-purple'), color: '#4b2470' },
];

export const MIXES: CollectionMeta[] = [
  { key: 'mix-daily', name: 'Daily Mix', blurb: 'Fifty playable songs, reshuffled every day.', photo: photo('singing-blue'), color: '#1f4f7a', mix: true },
  { key: 'mix-full', name: 'Full-Length Mix', blurb: 'Songs that play in full right here, with the controls in the bar.', photo: photo('guitar-portrait'), color: '#6b3a1f', mix: true },
  { key: 'mix-duets', name: 'Duets Mix', blurb: 'Playable songs he shared with other singers.', photo: photo('stage-band'), color: '#7a2a2a', mix: true },
  { key: 'mix-90s', name: '90s Mix', blurb: 'From the Anamika cassette onwards: the first decade.', photo: photo('portrait-blue'), color: '#24456b', mix: true },
  { key: 'mix-hindi', name: 'Hindi Mix', blurb: 'Bollywood and Hindi pop, from Ya Ali onwards.', photo: photo('stage-white'), color: '#6b1f2a', mix: true },
  { key: 'mix-deep', name: 'Deep Cuts Mix', blurb: 'Lesser-known streaming releases, reshuffled every day.', photo: photo('stage-teal'), color: '#1f5a5a', mix: true },
];

export const ALL_COLLECTIONS = [...COLLECTIONS, ...MIXES];
export const collectionMeta = (key: string) => ALL_COLLECTIONS.find((c) => c.key === key);

export const NATIVE: Record<string, string> = {
  Assamese: 'অসমীয়া', Hindi: 'हिन्दी', Bengali: 'বাংলা', Nepali: 'नेपाली', Bodo: 'बड़ो', Telugu: 'తెలుగు', Tamil: 'தமிழ்',
  Kannada: 'ಕನ್ನಡ', Malayalam: 'മലയാളം', Odia: 'ଓଡ଼ିଆ', Marathi: 'मराठी', Bhojpuri: 'भोजपुरी', Sindhi: 'سنڌي', Maithili: 'मैथिली',
  Santali: 'ᱥᱟᱱᱛᱟᱲᱤ', 'Bishnupriya Manipuri': 'বিষ্ণুপ্রিয়া', English: 'English', Punjabi: 'ਪੰਜਾਬੀ', Sanskrit: 'संस्कृतम्',
  Karbi: 'Karbi', Tiwa: 'Tiwa', Adi: 'Adi', Galo: 'Galo', Nyishi: 'Nyishi', Unspecified: '?',
};

/** Spotify-style tile colours for Browse. */
export const TILE_COLORS = ['#e13300', '#1e3264', '#8d67ab', '#e8115b', '#148a08', '#bc5900', '#509bf5', '#dc148c', '#477d95', '#8c1932', '#0d73ec', '#ba5d07', '#27856a', '#a56752', '#503750', '#e91429'];

export const KIND_LABEL: Record<string, string> = {
  'Film songs': 'Film',
  'Album songs': 'Album',
  Releases: 'Release',
  Singles: 'Single',
  'Theatre songs': 'Theatre',
  'Theme songs': 'Theme song',
  'TV & web series': 'Series',
  Bihu: 'Bihu album',
  'Label releases': 'Zubeen Garg Music',
};

/**
 * Songs released on his own label, Zubeen Garg Music, that other artists sing. For these the
 * singers are in `c` and Zubeen is not the main artist (he may be the composer, in `m`).
 */
export const LABEL_KIND = 'Label releases';

/** The artist line for a song: "Zubeen Garg, co-singers", or the singers of a label release. */
export const artistOf = (s: { k: string; c: string }) =>
  s.k === LABEL_KIND ? s.c || 'Zubeen Garg Music' : s.c ? `Zubeen Garg, ${s.c}` : 'Zubeen Garg';

export const SRC_INFO: Record<SourceKey, { short: string; long: string; via: string; full: boolean }> = {
  tg: { short: 'Full song', long: 'Full song, uploaded to this site and streamed from its archive', via: 'Archive', full: true },
  yt: { short: 'Full song', long: 'Full song on YouTube', via: 'YouTube', full: true },
  pv: { short: 'Preview', long: '30-second preview from Apple Music', via: 'Apple Music', full: false },
  sp: { short: 'Spotify', long: 'Spotify player (full song if you are signed in to Spotify)', via: 'Spotify', full: true },
  sa: { short: 'JioSaavn', long: 'JioSaavn album player (full songs; pick the track inside it)', via: 'JioSaavn', full: true },
};

export function sourcesOf(s: Partial<Pick<Song, SourceKey>>, preferFull: boolean): SourceKey[] {
  const order: SourceKey[] = preferFull ? ['tg', 'yt', 'sa', 'sp', 'pv'] : ['tg', 'yt', 'pv', 'sp', 'sa'];
  return order.filter((k) => !!s[k]);
}
export const isPlayable = (s: Partial<Pick<Song, SourceKey>>) => !!(s.tg || s.yt || s.pv || s.sp || s.sa);

/** Ids of uploaded songs that aren't in the catalogue start here. */
export const UPLOAD_BASE = 1_000_000;

/** Songs uploaded without a catalogue album have no album page; they link to the uploads page. */
export const albumHref = (s: Pick<Song, 'a'>) => (s.a >= 0 ? `/album/${s.a}` : '/uploads');
