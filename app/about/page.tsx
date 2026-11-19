import type { Metadata } from 'next';
import AboutView from '@/components/views/AboutView';
import { DB } from '@/lib/server/catalog';
import { TRIBUTE_SHORT } from '@/lib/tribute';

export const metadata: Metadata = { title: 'Who was Zubeen Garg', description: TRIBUTE_SHORT };

export default function AboutPage() {
  const by = (src: string) => DB.songs.filter((s) => s.src === src).length;
  return <AboutView stats={{ wiki: by('Wikipedia'), saavn: by('JioSaavn'), apple: by('Apple Music'), mb: by('MusicBrainz'), yt: by('YouTube'), credits: DB.credits.length }} />;
}
