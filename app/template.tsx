'use client';
import { motion } from 'motion/react';

/** Every navigation fades the new page up into place. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 30, mass: 0.8 }}>
      {children}
    </motion.div>
  );
}
