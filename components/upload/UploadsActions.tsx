'use client';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useOwner } from '@/store/owner';
import { IconUpload } from '@/components/ui/Icons';

/** The Uploads page's own Upload button (owner only); also refreshes the page when uploads change. */
export default function UploadsActions() {
  const owner = useOwner((s) => s.owner);
  const version = useOwner((s) => s.overlayVersion);
  const router = useRouter();
  const first = useRef<number | null>(null);
  useEffect(() => {
    if (first.current === null) first.current = version;
    else if (version !== first.current) router.refresh();
  }, [version, router]);
  if (!owner) return null;
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => useOwner.getState().openUpload()}
      className="flex h-8 items-center gap-1.5 rounded-full border border-white/30 px-3.5 text-[13px] font-bold text-white hover:border-white"
    >
      <IconUpload size={16} /> Upload
    </motion.button>
  );
}
