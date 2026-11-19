'use client';
import { MotionConfig } from 'motion/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, type ReactNode } from 'react';
import type { NavData } from '@/lib/types';
import { usePlayer, restorePlayer, toggleVideo } from '@/store/player';
import { useLibrary } from '@/store/library';
import { restoreUI, useUI } from '@/store/ui';
import { getSongs } from '@/lib/client/songCache';
import PlayerEngine from '@/components/player/PlayerEngine';
import PlayerBar, { MobileMiniPlayer } from '@/components/player/PlayerBar';
import RightPanel from '@/components/player/RightPanel';
import FullscreenPlayer from '@/components/player/FullscreenPlayer';
import { MiniMediaCard } from '@/components/player/MediaSlot';
import ContextMenu from '@/components/ui/ContextMenu';
import Toasts from '@/components/ui/Toasts';
import { MainScrollContext } from './MainScroll';
import { ShellDataContext } from './ShellData';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileTabs from './MobileTabs';
import EditPlaylistDialog from './EditPlaylistDialog';
import UploadDialog from '@/components/upload/UploadDialog';
import { useOwner } from '@/store/owner';

function Shortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing = !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
      const p = usePlayer.getState();
      const mod = e.ctrlKey || e.metaKey;
      if ((mod && e.key.toLowerCase() === 'k') || (!typing && e.key === '/')) {
        e.preventDefault();
        window.dispatchEvent(new Event('zg:focus-search'));
        return;
      }
      if (typing) return;
      if (e.key === ' ' && !el?.closest('button,a,[role=slider],[role=row]')) {
        e.preventDefault();
        p.toggle();
      } else if (mod && e.key === 'ArrowRight') {
        e.preventDefault();
        p.next();
      } else if (mod && e.key === 'ArrowLeft') {
        e.preventDefault();
        p.prev();
      } else if (e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault();
        p.seek(p.time + 5);
      } else if (e.shiftKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        p.seek(p.time - 5);
      } else if (e.key.toLowerCase() === 'm' && !mod) p.toggleMute();
      else if (e.key.toLowerCase() === 'l' && !mod && p.current) useLibrary.getState().toggleLike(p.current.id);
      else if (e.key.toLowerCase() === 'f' && !mod && p.current) useUI.getState().setFullscreen(!useUI.getState().fullscreen);
      else if (e.key.toLowerCase() === 'v' && !mod && p.source === 'yt') toggleVideo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}

/** Scroll to top on navigation, but restore the old position on back/forward (like Spotify). */
function ScrollManager({ main }: { main: React.RefObject<HTMLElement | null> }) {
  const path = usePathname();
  const params = useSearchParams();
  const url = path + '?' + params.toString();
  const positions = useRef(new Map<string, number>());
  const pop = useRef(false);
  const cur = useRef(url);
  useEffect(() => {
    const onPop = () => (pop.current = true);
    window.addEventListener('popstate', onPop);
    const el = main.current;
    const onScroll = () => el && positions.current.set(cur.current, el.scrollTop);
    el?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('popstate', onPop);
      el?.removeEventListener('scroll', onScroll);
    };
  }, [main]);
  useEffect(() => {
    const samePage = cur.current.split('?')[0] === path && path === '/search';
    cur.current = url;
    const el = main.current;
    if (!el) return;
    if (pop.current) {
      pop.current = false;
      const y = positions.current.get(url) ?? 0;
      requestAnimationFrame(() => el.scrollTo({ top: y }));
    } else if (!samePage) el.scrollTo({ top: 0 });
    useUI.getState().closeMenu();
  }, [url, path, main]);
  return null;
}

export default function AppShell({ nav, children }: { nav: NavData; children: ReactNode }) {
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    restoreUI();
    void useOwner.getState().load();
    void (async () => {
      await useLibrary.getState().load();
      const lib = useLibrary.getState();
      // artwork for playlist mosaics in the sidebar
      const ids = lib.playlists.flatMap((p) => p.songs.slice(0, 8).map((s) => s.id));
      if (ids.length) {
        await getSongs(ids);
        useLibrary.setState({ playlists: [...useLibrary.getState().playlists] });
      }
    })();
    void restorePlayer();
  }, []);

  return (
    <ShellDataContext.Provider value={nav}>
      <MainScrollContext.Provider value={main}>
        <MotionConfig reducedMotion="user">
          <div className="flex h-dvh flex-col bg-black md:p-2 md:pt-0">
            <TopBar />
            <div className="flex min-h-0 flex-1 gap-2">
              <Sidebar />
              <main ref={main} id="main" tabIndex={-1} className="scroll-y relative min-w-0 flex-1 bg-surface outline-none md:rounded-lg" style={{ paddingBottom: 'calc(var(--tabs-h) + 72px)' }}>
                <div className="md:pb-0">{children}</div>
              </main>
              <RightPanel />
            </div>
            <PlayerBar />
          </div>
          <MobileMiniPlayer />
          <MobileTabs />
          <MiniMediaCard />
          <FullscreenPlayer />
          <PlayerEngine />
          <ContextMenu />
          <EditPlaylistDialog />
          <UploadDialog />
          <Toasts />
          <Shortcuts />
          <Suspense fallback={null}>
            <ScrollManager main={main} />
          </Suspense>
        </MotionConfig>
      </MainScrollContext.Provider>
    </ShellDataContext.Provider>
  );
}
