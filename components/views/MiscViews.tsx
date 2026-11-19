'use client';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { Person } from '@/lib/types';
import { fmt, norm } from '@/lib/text';
import { Card, Grid } from '@/components/music/Cards';
import { PersonAvatar } from '@/components/ui/Cover';
import { IconSearch } from '@/components/ui/Icons';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

function Hero({ title, sub, color }: { title: string; sub: string; color: string }) {
  return (
    <div className="px-4 pt-6 pb-4 md:px-6 md:pt-16" style={{ background: `linear-gradient(${color}, transparent)` }}>
      <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="text-[32px] leading-none font-black tracking-tight md:text-[56px]">
        {title}
      </motion.h1>
      <p className="mt-2 max-w-[70ch] text-[14px] text-white/75">{sub}</p>
    </div>
  );
}

export function PeopleView({ groups }: { groups: { title: string; people: Person[] }[] }) {
  return (
    <div className="pb-10">
      <Hero title="Co-singers & Composers" sub="The people who appear most often in the credits. Numbers are songs in this catalogue; credits are only as complete as the sources." color="#477d95" />
      {groups.map((g) => (
        <section key={g.title} className="mt-6">
          <h2 className="px-4 pb-2 text-[22px] font-bold tracking-tight md:px-6 md:text-2xl">{g.title}</h2>
          <Grid>
            {g.people.map((p) => (
              <Card
                key={p.n}
                fixed={false}
                round
                href={`/person/${encodeURIComponent(p.n)}`}
                title={p.n}
                sub={`${fmt(p.count)} song${p.count === 1 ? '' : 's'}`}
                cover={<PersonAvatar name={p.n} className="w-full" />}
                play={{ ctx: { key: 'person:' + p.n, label: `With ${p.n}`, href: `/person/${encodeURIComponent(p.n)}`, kind: 'Artist' }, type: 'person', key: p.n }}
              />
            ))}
          </Grid>
        </section>
      ))}
    </div>
  );
}

export function CreditsView({ credits }: { credits: string[][] }) {
  const [role, setRole] = useState('All');
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const nq = norm(q);
    return credits.filter((c) => (role === 'All' || c[0] === role) && (!nq || norm(c.join(' ')).includes(nq)));
  }, [credits, role, q]);
  return (
    <div className="pb-10">
      <Hero title="Written & Composed by Him" sub={`${fmt(credits.length)} credits from Wikipedia for songs he composed, music-directed or wrote. Many were sung by others, so they are listed here rather than in the player.`} color="#ba5d07" />
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-surface/95 px-4 py-3 backdrop-blur md:px-6">
        {['All', 'Composer', 'Music director', 'Lyricist'].map((r) => (
          <button key={r} type="button" onClick={() => setRole(r)} className={cx('relative h-8 rounded-full px-3 text-[13px] font-semibold', role === r ? 'text-black' : 'bg-white/[.08] hover:bg-white/[.14]')}>
            {role === r && <motion.span layoutId="credit-role" className="absolute inset-0 rounded-full bg-white" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
            <span className="relative">{r}</span>
          </button>
        ))}
        <div className="flex h-8 min-w-[200px] flex-1 items-center gap-2 rounded-full bg-white/[.08] px-3 sm:max-w-[280px]">
          <IconSearch size={16} className="text-sub" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by song, film or singer" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-sub" />
        </div>
        <span className="ml-auto text-[13px] text-sub tabular">{fmt(list.length)} credits</span>
      </div>
      <div className="px-2 md:px-4">
        <div className="hidden grid-cols-[120px_60px_minmax(0,3fr)_minmax(0,3fr)_minmax(0,3fr)] gap-4 border-b border-white/10 px-3 py-2 text-[13px] text-sub md:grid">
          <span>Role</span>
          <span>Year</span>
          <span>Song</span>
          <span>Album or film</span>
          <span>Sung by</span>
        </div>
        {list.slice(0, 600).map((c, k) => (
          <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 rounded-md px-3 py-2.5 transition-colors hover:bg-white/[.07] md:grid-cols-[120px_60px_minmax(0,3fr)_minmax(0,3fr)_minmax(0,3fr)] md:items-center">
            <span className="order-3 text-[12px] font-semibold text-muga md:order-none md:text-[13px]">{c[0]}</span>
            <span className="order-2 text-right text-[13px] text-sub tabular md:order-none md:text-left">{c[1]}</span>
            <span className="order-1 truncate text-[15px] text-white md:order-none">{c[3] || '—'}</span>
            <span className="order-4 col-span-2 truncate text-[13px] text-sub md:order-none md:col-span-1 md:text-[14px]">{c[2]}</span>
            <span className="order-5 col-span-2 truncate text-[13px] text-sub md:order-none md:col-span-1 md:text-[14px]">{c[4]}</span>
          </div>
        ))}
        {list.length > 600 && <p className="px-3 py-4 text-[13px] text-sub">Showing the first 600; filter to narrow down.</p>}
      </div>
      <p className="px-6 pt-6 text-[13px] text-sub">
        Looking for songs he sang? <Link href="/songs" className="font-bold text-white hover:underline">Browse all songs</Link>.
      </p>
    </div>
  );
}
