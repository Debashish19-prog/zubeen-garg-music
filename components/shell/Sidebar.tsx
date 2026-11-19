'use client';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useUI } from '@/store/ui';
import { useLibrary } from '@/store/library';
import { IconLibrary, IconPlus } from '@/components/ui/Icons';
import LibraryList from './LibraryList';

export default function Sidebar() {
  const collapsed = useUI((s) => s.sidebarCollapsed);
  const toggle = useUI((s) => s.toggleSidebar);
  const router = useRouter();
  return (
    <motion.aside
      aria-label="Your Library"
      className="hidden min-h-0 flex-col overflow-hidden rounded-lg bg-surface md:flex"
      initial={false}
      animate={{ width: collapsed ? 80 : 'var(--side-w)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 34 }}
    >
      <div className={`flex h-16 shrink-0 items-center ${collapsed ? 'justify-center' : 'justify-between pr-4 pl-4'}`}>
        <button type="button" onClick={toggle} data-tip={collapsed ? 'Expand Your Library' : 'Collapse Your Library'} data-tip-pos="bottom" className="flex items-center gap-3 font-bold text-sub transition-colors hover:text-white">
          <IconLibrary size={24} />
          {!collapsed && <span className="text-[16px]">Your Library</span>}
        </button>
        {!collapsed && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            data-tip="Create playlist"
            aria-label="Create playlist"
            onClick={async () => {
              const p = await useLibrary.getState().createPlaylist();
              if (p) router.push('/playlist/' + p.id);
            }}
            className="grid h-8 w-8 place-items-center rounded-full text-sub transition-colors hover:bg-white/10 hover:text-white"
          >
            <IconPlus size={18} />
          </motion.button>
        )}
      </div>
      <LibraryList collapsed={collapsed} />
    </motion.aside>
  );
}
