// Copies the song catalogue into web/data/catalog.json.
//
//   node scripts/import-data.mjs                      -> extracts it from ../zubeen-music/index.html (the legacy page)
//   node scripts/import-data.mjs path/to/site.json    -> uses the output of scripts/build_site_data.py directly
//
// The format is the compact one written by build_site_data.py: { fields, songs, albums, credits }.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'data', 'catalog.json');
const arg = process.argv[2];

let data;
if (arg && arg.endsWith('.json')) {
  data = JSON.parse(fs.readFileSync(arg, 'utf8'));
} else {
  const legacy = arg || path.join(here, '..', '..', 'zubeen-music', 'index.html');
  const html = fs.readFileSync(legacy, 'utf8');
  const m = html.match(/<script id="zg-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('No embedded catalogue found in ' + legacy);
  data = JSON.parse(m[1].replace(/<\\\//g, '</'));
}
for (const k of ['fields', 'songs', 'albums', 'credits']) if (!data[k]) throw new Error('Missing "' + k + '" in catalogue');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(data));
console.log(`catalog.json: ${data.songs.length} songs, ${data.albums.length} albums, ${data.credits.length} credits`);
