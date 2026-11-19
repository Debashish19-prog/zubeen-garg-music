'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { IconHome, IconHomeOutline, IconLibrary, IconSearch, IconUpload } from '@/components/ui/Icons';
import { useOwner } from '@/store/owner';

const TABS = [
  { href: '/', label: 'Home', icon: IconHomeOutline, on: IconHome, match: (p: string) => p === '/' },
  { href: '/search', label: 'Search', icon: IconSearch, on: IconSearch, match: (p: string) => p.startsWith('/search') },
  { href: '/library', label: 'Your Library', icon: IconLibrary, on: IconLibrary, match: (p: string) => p.startsWith('/library') || p.startsWith('/liked') || p.startsWith('/playlist') },
];

/** Bottom tab bar on phones (Spotify mobile style: fades from transparent to black). */
export default function MobileTabs() {
  const path = usePathname();
  const owner = useOwner((s) => s.owner);
  return (
    <nav aria-label="Sections" className="pb-safe fixed inset-x-0 bottom-0 z-30 flex h-[var(--tabs-h)] items-start bg-gradient-to-b from-black/70 via-black/95 to-black pt-2 md:hidden">
      {TABS.map((t) => {
        const on = t.match(path);
        const Icon = on ? t.on : t.icon;
        return (
          <Link key={t.href} href={t.href} className={`relative flex flex-1 flex-col items-center gap-1 text-[11px] font-medium ${on ? 'text-white' : 'text-sub'}`} aria-current={on ? 'page' : undefined}>
            <motion.span whileTap={{ scale: 0.85 }} className="grid place-items-center">
              <Icon size={26} />
            </motion.span>
            {t.label}
            {on && <motion.span layoutId="tab-dot" className="absolute -top-2 h-0.5 w-8 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
          </Link>
        );
      })}
      {owner && (
        <button type="button" onClick={() => useOwner.getState().openUpload()} className="relative flex flex-1 flex-col items-center gap-1 text-[11px] font-medium text-sub">
          <motion.span whileTap={{ scale: 0.85 }} className="grid place-items-center">
            <IconUpload size={26} />
          </motion.span>
          Upload
        </button>
      )}
    </nav>
  );
}
