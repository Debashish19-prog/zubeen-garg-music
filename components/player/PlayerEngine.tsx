'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';
import { registerEngine, usePlayer, showsMedia, type Engine } from '@/store/player';
import { activeSlot } from '@/lib/client/mediaSlots';
import { peek, withTg } from '@/lib/client/songCache';
import { toast, useUI } from '@/store/ui';
import type { SourceKey } from '@/lib/types';
import { artistOf } from '@/lib/meta';

/** Uploaded songs (streamed from the site's Telegram archive) and Apple Music previews both play in the <audio> element. */
const isAudio = (k: SourceKey | null | undefined) => k === 'tg' || k === 'pv';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    onSpotifyIframeApiReady?: (api: any) => void;
  }
}

function loadScript(src: string) {
  return new Promise<void>((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error('load ' + src));
    document.head.appendChild(s);
  });
}
let ytReady: Promise<any> | null = null;
function ensureYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise<any>((res, rej) => {
    if (window.YT?.Player) return res(window.YT);
    window.onYouTubeIframeAPIReady = () => res(window.YT);
    loadScript('https://www.youtube.com/iframe_api').catch(rej);
    setTimeout(() => rej(new Error('timeout')), 12000);
  }).catch((e) => {
    ytReady = null;
    throw e;
  });
  return ytReady;
}
let spReady: Promise<any> | null = null;
function ensureSP() {
  if (spReady) return spReady;
  spReady = new Promise<any>((res, rej) => {
    window.onSpotifyIframeApiReady = (api) => res(api);
    loadScript('https://open.spotify.com/embed/iframe-api/v1').catch(rej);
    setTimeout(() => rej(new Error('timeout')), 12000);
  }).catch((e) => {
    spReady = null;
    throw e;
  });
  return spReady;
}

/**
 * Owns every real player: <audio> for uploaded songs and Apple Music previews, the YouTube IFrame player, the Spotify
 * embed controller and the JioSaavn album widget. The bar, panels and fullscreen view drive it
 * through the player store. The iframes sit in a fixed "stage" that glides to whichever media slot
 * is on screen (now-playing panel, fullscreen view, or the floating mini card).
 */
export default function PlayerEngine() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ytHostRef = useRef<HTMLDivElement>(null);
  const spHostRef = useRef<HTMLDivElement>(null);
  const saRef = useRef<HTMLIFrameElement>(null);
  const source = usePlayer((s) => s.source);

  useEffect(() => {
    const audio = audioRef.current!;
    const st = () => usePlayer.getState();
    let active: SourceKey | null = null;
    let yt: any = null;
    let ytTimer: ReturnType<typeof setInterval> | null = null;
    let sp: any = null;
    let spWas = false;
    let loadSeq = 0;
    let warmed = '';

    /* Spotify-style soft pause and resume: a short volume ramp instead of a click */
    let fadeRaf = 0;
    const targetVol = () => (st().muted ? 0 : st().volume);
    const fade = (to: number, ms: number, done?: () => void) => {
      cancelAnimationFrame(fadeRaf);
      if (document.hidden) {
        // animation frames don't run in background tabs
        audio.volume = to;
        done?.();
        return;
      }
      const from = audio.volume;
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / ms);
        audio.volume = Math.max(0, Math.min(1, from + (to - from) * k * (2 - k)));
        if (k < 1) fadeRaf = requestAnimationFrame(step);
        else done?.();
      };
      fadeRaf = requestAnimationFrame(step);
    };

    /* near the end of a song, ask the server for the start of the next uploaded song so it starts at once */
    const warmNext = () => {
      const p = st();
      const id = p.queue[p.order[p.pos + 1]];
      const s = id === undefined ? undefined : peek(id);
      const url = s ? withTg(s).tg : '';
      if (!url || url === warmed) return;
      warmed = url;
      fetch(url, { headers: { Range: 'bytes=0-1048575' } })
        .then((r) => r.arrayBuffer())
        .catch(() => undefined);
    };

    const stopAll = (except?: SourceKey) => {
      if (!isAudio(except)) {
        cancelAnimationFrame(fadeRaf);
        audio.pause();
        if (audio.src) audio.removeAttribute('src');
      }
      if (except !== 'yt' && yt?.pauseVideo) {
        try {
          yt.pauseVideo();
        } catch {
          /* not ready */
        }
      }
      if (except !== 'sp' && sp) {
        try {
          sp.pause();
        } catch {
          /* not ready */
        }
      }
      if (except !== 'sa' && saRef.current && saRef.current.src !== 'about:blank') saRef.current.src = 'about:blank';
      if (ytTimer) clearInterval(ytTimer);
      ytTimer = null;
    };

    const mediaSession = () => {
      const s = st().current;
      if (!s || !('mediaSession' in navigator)) return;
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: s.t,
          artist: artistOf(s),
          album: s.an,
          artwork: s.img ? [{ src: s.img, sizes: '500x500', type: 'image/jpeg' }] : [],
        });
        navigator.mediaSession.setActionHandler('play', () => st().play());
        navigator.mediaSession.setActionHandler('pause', () => st().pause());
        navigator.mediaSession.setActionHandler('nexttrack', () => st().next());
        navigator.mediaSession.setActionHandler('previoustrack', () => st().prev());
        navigator.mediaSession.setActionHandler('seekto', (d) => d.seekTime != null && st().seek(d.seekTime));
      } catch {
        /* unsupported action */
      }
    };

    const engine: Engine = {
      load(song, k, ytId) {
        const seq = ++loadSeq;
        active = k;
        spWas = false;
        stopAll(k);
        const vol = st().muted ? 0 : st().volume;
        mediaSession();
        if (k === 'pv' || k === 'tg') {
          cancelAnimationFrame(fadeRaf);
          audio.src = k === 'tg' ? song.tg : song.pv;
          audio.volume = vol;
          audio.play().catch((e: Error) => {
            if (seq !== loadSeq || e?.name === 'AbortError') return;
            st()._status('paused');
            toast(k === 'tg' ? 'Press play to start the song.' : 'Press play to start the preview.');
          });
        } else if (k === 'yt') {
          ensureYT()
            .then((YT) => {
              if (seq !== loadSeq) return;
              if (!yt) {
                const el = document.createElement('div');
                ytHostRef.current!.innerHTML = '';
                ytHostRef.current!.appendChild(el);
                const vars: Record<string, string | number> = { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3 };
                if (/^https?:/.test(location.protocol)) vars.origin = location.origin;
                yt = new YT.Player(el, {
                  width: '100%',
                  height: '100%',
                  videoId: ytId,
                  playerVars: vars,
                  events: {
                    onReady: (e: any) => {
                      e.target.setVolume((st().muted ? 0 : st().volume) * 100);
                      if (active === 'yt') e.target.playVideo();
                    },
                    onStateChange: (e: any) => {
                      if (active !== 'yt') return;
                      if (e.data === 1) st()._status('playing');
                      else if (e.data === 2) st()._status('paused');
                      else if (e.data === 3) st()._status('loading');
                      else if (e.data === 0) st()._ended();
                    },
                    onError: (e: any) => {
                      console.warn('[zubeen] YouTube player error', e?.data);
                      if (active === 'yt') st()._error('YouTube won’t play this video here.');
                    },
                  },
                });
              } else {
                yt.loadVideoById(ytId);
                yt.setVolume(vol * 100);
              }
              if (ytTimer) clearInterval(ytTimer);
              ytTimer = setInterval(() => {
                if (active === 'yt' && yt?.getCurrentTime && st().status === 'playing') st()._progress(yt.getCurrentTime() || 0, yt.getDuration() || 0);
              }, 250);
            })
            .catch(() => seq === loadSeq && st()._error('Couldn’t reach YouTube.'));
        } else if (k === 'sp') {
          ensureSP()
            .then((api) => {
              if (seq !== loadSeq) return;
              const uri = 'spotify:track:' + song.sp;
              if (!sp) {
                const el = document.createElement('div');
                spHostRef.current!.innerHTML = '';
                spHostRef.current!.appendChild(el);
                api.createController(el, { uri, width: '100%', height: 152 }, (c: any) => {
                  sp = c;
                  c.addListener('ready', () => {
                    if (active === 'sp') c.play();
                  });
                  c.addListener('playback_update', (e: any) => {
                    if (active !== 'sp') return;
                    const d = e.data;
                    st()._progress(d.position / 1000, d.duration / 1000);
                    st()._status(d.isBuffering ? 'loading' : d.isPaused ? 'paused' : 'playing');
                    if (!d.isPaused) spWas = true;
                    if (spWas && d.isPaused && d.duration > 0 && d.position >= d.duration - 900) {
                      spWas = false;
                      st()._ended();
                    }
                  });
                });
              } else {
                sp.loadUri(uri);
                sp.play();
              }
            })
            .catch(() => seq === loadSeq && st()._error('Couldn’t reach Spotify.'));
        } else if (k === 'sa') {
          if (saRef.current) saRef.current.src = 'https://www.jiosaavn.com/embed/album/' + song.sa;
          st()._status('external');
        }
      },
      play() {
        if (isAudio(active)) {
          cancelAnimationFrame(fadeRaf);
          audio.volume = 0;
          audio
            .play()
            .then(() => fade(targetVol(), 220))
            .catch(() => {
              audio.volume = targetVol();
              st()._status('paused');
            });
        }
        else if (active === 'yt') yt?.playVideo?.();
        else if (active === 'sp') sp?.resume?.();
      },
      pause() {
        if (isAudio(active))
          fade(0, 160, () => {
            audio.pause();
            audio.volume = targetVol();
          });
        else if (active === 'yt') yt?.pauseVideo?.();
        else if (active === 'sp') sp?.pause?.();
      },
      seek(t) {
        if (isAudio(active) && audio.duration) audio.currentTime = t;
        else if (active === 'yt') yt?.seekTo?.(t, true);
        else if (active === 'sp') sp?.seek?.(t);
      },
      setVolume(v) {
        cancelAnimationFrame(fadeRaf);
        audio.volume = v;
        yt?.setVolume?.(v * 100);
      },
      stop() {
        stopAll();
        active = null;
      },
    };
    registerEngine(engine);

    let posAt = 0;
    const onTime = () => {
      if (!isAudio(active)) return;
      const d = Number.isFinite(audio.duration) ? audio.duration : 0;
      st()._progress(audio.currentTime, d || (active === 'pv' ? 30 : st().duration));
      if (d && d - audio.currentTime < 25) warmNext();
      // lock-screen / notification scrubber
      if (d && 'mediaSession' in navigator && performance.now() - posAt > 900) {
        posAt = performance.now();
        try {
          navigator.mediaSession.setPositionState?.({ duration: d, position: Math.min(audio.currentTime, d), playbackRate: audio.playbackRate || 1 });
        } catch {
          /* unsupported */
        }
      }
    };
    const onEnded = () => isAudio(active) && st()._ended();
    const onPlay = () => isAudio(active) && st()._status('playing');
    const onPause = () => isAudio(active) && !audio.ended && st()._status('paused');
    const onWait = () => isAudio(active) && st()._status('loading');
    const onErr = () => isAudio(active) && audio.getAttribute('src') && st()._error(active === 'tg' ? 'The uploaded song didn’t load.' : 'The preview didn’t load.');
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWait);
    audio.addEventListener('error', onErr);

    const unsub = usePlayer.subscribe((s, p) => {
      if ('mediaSession' in navigator && s.status !== p.status) navigator.mediaSession.playbackState = s.status === 'playing' ? 'playing' : 'paused';
    });

    return () => {
      registerEngine(null);
      unsub();
      stopAll();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWait);
      audio.removeEventListener('error', onErr);
    };
  }, []);

  /* the stage follows the active slot with a critically-damped glide */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const cur = { x: 0, y: 0, w: 0, h: 0, o: 0 };
    let shown = false;
    let applied = '';
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const stage = stageRef.current;
      if (!stage) return;
      // with "Hide video" on, a YouTube song has no slot: the stage fades out and the player keeps playing behind it
      const visual = showsMedia(usePlayer.getState().source, useUI.getState().hideVideo);
      const slot = visual ? activeSlot() : null;
      if (slot) {
        const r = slot.getBoundingClientRect();
        if (!shown) {
          Object.assign(cur, { x: r.left, y: r.top + 16, w: r.width, h: r.height, o: 0 });
          shown = true;
        }
        const k = 1 - Math.exp(-dt * 15);
        cur.x += (r.left - cur.x) * k;
        cur.y += (r.top - cur.y) * k;
        cur.w += (r.width - cur.w) * k;
        cur.h += (r.height - cur.h) * k;
        cur.o += (1 - cur.o) * Math.min(1, k * 1.4);
        if (Math.abs(r.left - cur.x) < 0.3) cur.x = r.left;
        if (Math.abs(r.top - cur.y) < 0.3) cur.y = r.top;
        if (Math.abs(r.width - cur.w) < 0.3) cur.w = r.width;
        if (Math.abs(r.height - cur.h) < 0.3) cur.h = r.height;
        let clip = 'none';
        const clipEl = slot.closest('[data-slot-clip]');
        const radius = slot.dataset.radius || '8';
        if (clipEl) {
          const c = clipEl.getBoundingClientRect();
          const t = Math.max(0, c.top - cur.y), b = Math.max(0, cur.y + cur.h - c.bottom);
          const l = Math.max(0, c.left - cur.x), rr = Math.max(0, cur.x + cur.w - c.right);
          clip = `inset(${t}px ${rr}px ${b}px ${l}px round ${radius}px)`;
        } else clip = `inset(0 round ${radius}px)`;
        const sig = `${cur.x.toFixed(1)}|${cur.y.toFixed(1)}|${cur.w.toFixed(1)}|${cur.h.toFixed(1)}|${cur.o.toFixed(2)}|${clip}|${slot.dataset.z}`;
        if (sig !== applied) {
          applied = sig;
          stage.style.transform = `translate3d(${cur.x}px,${cur.y}px,0)`;
          stage.style.width = cur.w + 'px';
          stage.style.height = cur.h + 'px';
          stage.style.opacity = String(cur.o);
          stage.style.clipPath = clip;
          stage.style.zIndex = slot.dataset.z || '30';
          stage.style.visibility = 'visible';
          stage.style.pointerEvents = cur.o > 0.5 ? 'auto' : 'none';
        }
      } else if (shown) {
        cur.o += (0 - cur.o) * Math.min(1, dt * 18);
        stage.style.opacity = String(cur.o);
        stage.style.pointerEvents = 'none';
        if (cur.o < 0.02) {
          shown = false;
          applied = '';
          stage.style.visibility = 'hidden';
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <audio ref={audioRef} preload="none" />
      <div ref={stageRef} className="fixed left-0 top-0 overflow-hidden bg-black shadow-2xl" style={{ visibility: 'hidden', opacity: 0, zIndex: 30, willChange: 'transform' }} aria-label="Media player">
        <div ref={ytHostRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" style={{ display: source === 'yt' ? 'block' : 'none' }} />
        <div ref={spHostRef} className="absolute inset-0 [&_iframe]:block [&_iframe]:w-full" style={{ display: source === 'sp' ? 'block' : 'none' }} />
        <iframe
          ref={saRef}
          title="JioSaavn player"
          src="about:blank"
          allow="autoplay; encrypted-media"
          className="absolute inset-0 h-full w-full border-0 bg-[#1b1b1b]"
          style={{ display: source === 'sa' ? 'block' : 'none' }}
        />
      </div>
    </>
  );
}
