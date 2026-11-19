'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useUI } from '@/store/ui';

export default function Toasts() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[90] flex flex-col items-center gap-2 px-4" style={{ bottom: 'calc(var(--bar-h) + var(--tabs-h) + 84px)' }} aria-live="polite" role="status">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.button
            type="button"
            layout
            key={t.id}
            onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            className="pointer-events-auto max-w-[min(560px,92vw)] rounded-lg bg-white px-4 py-2.5 text-center text-sm font-semibold text-black shadow-[0_8px_24px_rgba(0,0,0,.5)]"
          >
            {t.msg}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
