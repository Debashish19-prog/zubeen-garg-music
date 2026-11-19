'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconClose, IconGrid, IconHome, IconHomeOutline, IconInfo, IconSearch, IconUpload } from '@/components/ui/Icons';
import { useOwner } from '@/store/owner';

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md px-1" aria-label="Zubeen, home">
      <span className="weave-cot block h-8 w-8 shrink-0 rounded-[7px] shadow-[0_0_0_1px_rgba(255,255,255,.08)]" style={{ backgroundSize: 'auto 100%' }} />
      {!compact && (
        <span className="leading-none">
          <span className="block text-[17px] font-black tracking-tight">Zubeen</span>
          <span className="font-bangla block text-[11px] font-semibold text-sub">জুবিন গাৰ্গ</span>
        </span>
      )}
    </Link>
  );
}

function SearchBox() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const urlQ = path === '/search' ? params.get('q') || '' : '';
  const [q, setQ] = useState(urlQ);
  const ref = useRef<HTMLInputElement>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setQ(urlQ), [urlQ]);
  useEffect(() => {
    const focus = () => ref.current?.focus();
    window.addEventListener('zg:focus-search', focus);
    return () => window.removeEventListener('zg:focus-search', focus);
  }, []);

  const go = (v: string, push: boolean) => {
    const url = v ? `/search?q=${encodeURIComponent(v)}` : '/search';
    if (push) router.push(url);
    else router.replace(url);
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(q, path !== '/search');
      }}
      className="group flex h-12 w-full max-w-[474px] items-center rounded-full bg-[#1f1f1f] pr-2 pl-3 ring-white/0 transition-[background,box-shadow] duration-200 focus-within:ring-2 focus-within:ring-white hover:bg-[#2a2a2a] hover:ring-1 hover:ring-white/20"
    >
      <IconSearch size={22} className="shrink-0 text-sub group-focus-within:text-white" />
      <input
        ref={ref}
        value={q}
        onChange={(e) => {
          const v = e.target.value;
          setQ(v);
          if (t.current) clearTimeout(t.current);
          t.current = setTimeout(() => go(v, path !== '/search'), 180);
        }}
        onFocus={() => path !== '/search' && router.prefetch('/search')}
        placeholder="What do you want to play?"
        aria-label="Search songs, albums, films and people"
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] text-white outline-none placeholder:text-[#a0a0a0]"
      />
      {q ? (
        <button type="button" aria-label="Clear search" onClick={() => (setQ(''), go('', false))} className="grid h-8 w-8 place-items-center text-sub hover:text-white">
          <IconClose size={18} />
        </button>
      ) : (
        <Link href="/search" aria-label="Browse" data-tip="Browse" data-tip-pos="bottom" className="ml-1 grid h-8 w-10 place-items-center border-l border-white/20 pl-2 text-sub hover:text-white">
          <IconGrid size={20} />
        </Link>
      )}
    </form>
  );
}

/** Spotify's white "Explore Premium" pill, as the owner's way in to uploading. */
function UploadButton() {
  const owner = useOwner((s) => s.owner);
  if (!owner) return null;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => useOwner.getState().openUpload()}
      data-tip="Upload songs to Telegram"
      data-tip-pos="bottom"
      className="flex h-8 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-bold text-black"
    >
      <IconUpload size={17} /> Upload
    </motion.button>
  );
}

export default function TopBar() {
  const router = useRouter();
  const path = usePathname();
  const nav = 'grid h-8 w-8 place-items-center rounded-full bg-black/70 text-sub transition-colors hover:text-white';
  return (
    <div className="hidden h-16 shrink-0 items-center gap-2 px-2 md:flex">
      <div className="flex w-[calc(var(--side-w)-8px)] shrink-0 items-center gap-2 pl-2 lg:w-[calc(var(--side-w)-8px)]">
        <Brand />
        <div className="ml-auto flex gap-2 pr-2">
          <button type="button" aria-label="Go back" data-tip="Go back" data-tip-pos="bottom" className={nav} onClick={() => router.back()}>
            <IconChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Go forward" data-tip="Go forward" data-tip-pos="bottom" className={nav} onClick={() => router.forward()}>
            <IconChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <motion.div whileTap={{ scale: 0.92 }}>
          <Link href="/" aria-label="Home" data-tip="Home" data-tip-pos="bottom" className="grid h-12 w-12 place-items-center rounded-full bg-[#1f1f1f] text-sub transition-[color,transform] hover:scale-105 hover:text-white">
            {path === '/' ? <IconHome size={24} className="text-white" /> : <IconHomeOutline size={24} />}
          </Link>
        </motion.div>
        <Suspense fallback={<div className="h-12 w-full max-w-[474px] rounded-full bg-[#1f1f1f]" />}>
          <SearchBox />
        </Suspense>
      </div>
      <div className="flex min-w-[180px] shrink-0 items-center justify-end gap-1 pr-2">
        {/* Upload button turned off for the public site (see UPLOADS_ENABLED in lib/server/owner.ts) */}
        {/* <UploadButton /> */}
        <Link href="/about" data-tip="About Zubeen and this site" data-tip-pos="bottom" className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[14px] font-bold text-sub transition-colors hover:scale-[1.03] hover:text-white">
          <IconInfo size={18} /> About
        </Link>
      </div>
    </div>
  );
}
