import type { Metadata } from 'next';
import { PeopleView } from '@/components/views/MiscViews';
import { topPeople } from '@/lib/server/catalog';

export const metadata: Metadata = { title: 'Co-singers & Composers' };

export default function PeoplePage() {
  return (
    <PeopleView
      groups={[
        { title: 'Co-singers', people: topPeople('Co-singer', 36) },
        { title: 'Music directors and composers', people: topPeople('Music', 24) },
        { title: 'Lyricists', people: topPeople('Lyrics', 24) },
      ]}
    />
  );
}
