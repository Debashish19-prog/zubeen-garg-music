import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListPage from '@/components/music/ListPage';
import { filterIds, listPayload, people } from '@/lib/server/catalog';
import { hashColor } from '@/lib/text';

type P = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  return { title: decodeURIComponent((await params).name) };
}

export default async function PersonPage({ params }: P) {
  const name = decodeURIComponent((await params).name);
  const p = people()[name];
  if (!p) notFound();
  const ids = filterIds([...p.ids], { sort: 'year' });
  const roles = [...p.roles].map((r) => (r === 'Music' ? 'Music director / composer' : r === 'Lyrics' ? 'Lyricist' : r));
  return (
    <ListPage
      ctx={{ key: 'person:' + name, label: `With ${name}`, href: '/person/' + encodeURIComponent(name), kind: 'Artist' }}
      kind={roles.join(' · ')}
      title={name}
      desc={`Songs where ${name} appears in the credits alongside Zubeen Garg.`}
      cover={{ type: 'person', name }}
      color={hashColor(name)}
      list={listPayload(ids, 100)}
      source={{ type: 'person', key: name }}
      defaultSort="year"
    />
  );
}
