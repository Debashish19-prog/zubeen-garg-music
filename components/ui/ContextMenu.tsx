'use client';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useUI, type MenuItem } from '@/store/ui';
import { useIsMobile } from '@/lib/client/hooks';
import { IconCheck, IconChevronLeft, IconChevronRight, IconExternal } from './Icons';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

function Row({ it, onPick, onSub, active }: { it: MenuItem; onPick: () => void; onSub?: (el: HTMLElement) => void; active?: boolean }) {
  if (it.divider) return <hr className="mx-1 my-1 border-white/10" />;
  if (it.heading) return <div className="truncate px-3 pt-2 pb-1 text-xs font-bold text-sub">{it.label}</div>;
  const inner = (
    <>
      <span className="grid w-5 shrink-0 place-items-center text-sub [&_svg]:h-[18px] [&_svg]:w-[18px]">{it.icon}</span>
      <span className="min-w-0 flex-1 truncate">{it.label}</span>
      {it.checked && <IconCheck size={18} className="text-accent" />}
      {it.external && <IconExternal size={14} className="text-sub" />}
      {it.submenu && <IconChevronRight size={16} className="text-sub" />}
    </>
  );
  const cls = cx('flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-[14px] font-medium transition-colors md:py-2', active ? 'bg-white/10' : 'hover:bg-white/10', it.danger && 'text-[#ff7b72]');
  if (it.href)
    return it.external ? (
      <a href={it.href} target="_blank" rel="noopener noreferrer" role="menuitem" className={cls} onClick={onPick}>
        {inner}
      </a>
    ) : (
      <Link href={it.href} role="menuitem" className={cls} onClick={onPick}>
        {inner}
      </Link>
    );
  return (
    <button
      type="button"
      role="menuitem"
      className={cls}
      onMouseEnter={(e) => it.submenu && onSub?.(e.currentTarget)}
      onClick={(e) => {
        if (it.submenu) onSub?.(e.currentTarget);
        else {
          it.onSelect?.();
          onPick();
        }
      }}
    >
      {inner}
    </button>
  );
}

function DesktopMenu({ x, y, items, close }: { x: number; y: number; items: MenuItem[]; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y, origin: 'top left' });
  const [sub, setSub] = useState<{ items: MenuItem[]; left: number; top: number; idx: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current!;
    const w = el.offsetWidth, h = el.offsetHeight;
    const left = x + w > window.innerWidth - 8 ? Math.max(8, x - w) : x;
    const top = y + h > window.innerHeight - 8 ? Math.max(8, y - h) : y;
    setPos({ left, top, origin: `${left < x ? 'right' : 'left'} ${top < y ? 'bottom' : 'top'}` });
  }, [x, y]);

  return (
    <>
      <motion.div
        ref={ref}
        role="menu"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
        transition={{ type: 'spring', stiffness: 600, damping: 36 }}
        style={{ left: pos.left, top: pos.top, transformOrigin: pos.origin }}
        className="fixed z-[80] max-h-[70vh] w-[min(300px,calc(100vw-16px))] overflow-y-auto rounded-md bg-[#282828] p-1 shadow-[0_16px_40px_rgba(0,0,0,.55)]"
        onContextMenu={(e) => e.preventDefault()}
      >
        {items.map((it, k) => (
          <Row
            key={k}
            it={it}
            active={sub?.idx === k}
            onPick={close}
            onSub={
              it.submenu
                ? (el) => {
                    const r = el.getBoundingClientRect();
                    const w = 260;
                    const left = r.right + w > window.innerWidth - 8 ? r.left - w + 4 : r.right - 4;
                    setSub({ items: it.submenu!, left, top: Math.min(r.top - 4, window.innerHeight - 40 * it.submenu!.length - 16), idx: k });
                  }
                : () => setSub(null)
            }
          />
        ))}
      </motion.div>
      <AnimatePresence>
        {sub && (
          <motion.div
            key={sub.idx}
            role="menu"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            style={{ left: sub.left, top: Math.max(8, sub.top) }}
            className="fixed z-[81] max-h-[60vh] w-[260px] overflow-y-auto rounded-md bg-[#282828] p-1 shadow-[0_16px_40px_rgba(0,0,0,.55)]"
          >
            {sub.items.map((it, k) => (
              <Row key={k} it={it} onPick={close} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MobileSheet({ items, close }: { items: MenuItem[]; close: () => void }) {
  const [stack, setStack] = useState<MenuItem[][]>([items]);
  const cur = stack[stack.length - 1];
  return (
    <>
      <motion.div className="fixed inset-0 z-[79] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
      <motion.div
        role="menu"
        className="pb-safe fixed inset-x-0 bottom-0 z-[80] max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-[#242424] px-2 pt-2 shadow-2xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 420, damping: 40 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, i) => (i.offset.y > 90 || i.velocity.y > 600) && close()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/30" />
        {stack.length > 1 && (
          <button type="button" className="flex w-full items-center gap-2 px-3 py-3 text-sm font-bold text-sub" onClick={() => setStack(stack.slice(0, -1))}>
            <IconChevronLeft size={18} /> Back
          </button>
        )}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={stack.length} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.18 }} className="pb-3">
            {cur.map((it, k) => (
              <Row key={k} it={it} onPick={close} onSub={it.submenu ? () => setStack([...stack, it.submenu!]) : undefined} />
            ))}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </>
  );
}

export default function ContextMenu() {
  const menu = useUI((s) => s.menu);
  const close = useUI((s) => s.closeMenu);
  const mobile = useIsMobile();

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('[role=menu]')) close();
    };
    const onScroll = () => !mobile && close();
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('resize', close);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [menu, close, mobile]);

  return <AnimatePresence>{menu && (mobile ? <MobileSheet key={menu.key} items={menu.items} close={close} /> : <DesktopMenu key={menu.key} x={menu.x} y={menu.y} items={menu.items} close={close} />)}</AnimatePresence>;
}
