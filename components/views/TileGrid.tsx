'use client';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { staggerVariants } from '@/components/music/Cards';

export function TileGrid({ title, sub, color, children }: { title: string; sub: string; color: string; children: ReactNode }) {
  return (
    <div className="pb-10">
      <div className="px-4 pt-6 pb-4 md:px-6 md:pt-16" style={{ background: `linear-gradient(${color}, transparent)` }}>
        <h1 className="text-[32px] leading-none font-black tracking-tight md:text-[56px]">{title}</h1>
        <p className="mt-2 max-w-[70ch] text-[14px] text-white/80">{sub}</p>
      </div>
      <motion.div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 md:px-6 lg:grid-cols-4 xl:grid-cols-5" initial="hidden" animate="show" variants={staggerVariants}>
        {children}
      </motion.div>
    </div>
  );
}
