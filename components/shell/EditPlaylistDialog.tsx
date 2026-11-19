'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useUI } from '@/store/ui';
import { useLibrary } from '@/store/library';
import { peek } from '@/lib/client/songCache';
import { MosaicCover } from '@/components/ui/Cover';
import { IconClose } from '@/components/ui/Icons';

/** Spotify's "Edit details" modal: name and description. */
export default function EditPlaylistDialog() {
  const id = useUI((u) => u.editPlaylist);
  const close = () => useUI.getState().setEditPlaylist(null);
  const p = useLibrary((s) => s.playlists.find((x) => x.id === id));
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  useEffect(() => {
    if (p) {
      setName(p.name);
      setDesc(p.desc);
    }
  }, [p]);
  useEffect(() => {
    if (!id) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [id]);

  return (
    <AnimatePresence>
      {id && p && (
        <motion.div key="dlg" className="fixed inset-0 z-[85] grid place-items-center bg-black/70 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.form
            role="dialog"
            aria-label="Edit details"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              void useLibrary.getState().updatePlaylist(p.id, { name: name.trim() || p.name, desc });
              close();
            }}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="w-full max-w-[524px] rounded-lg bg-[#282828] p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Edit details</h2>
              <button type="button" aria-label="Close" onClick={close} className="grid h-8 w-8 place-items-center rounded-full text-sub hover:bg-white/10 hover:text-white">
                <IconClose size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="mx-auto w-[180px] shrink-0 shadow-xl">
                <MosaicCover name={p.name} imgs={p.songs.slice(0, 12).map((s) => peek(s.id)?.img || '')} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <label className="relative block">
                  <span className="absolute -top-2 left-2.5 bg-[#282828] px-1 text-[11px] font-bold text-sub">Name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus className="h-10 w-full rounded bg-white/10 px-3 text-[14px] outline-none focus:bg-[#333] focus:ring-1 focus:ring-white/40" />
                </label>
                <label className="relative block flex-1">
                  <span className="absolute -top-2 left-2.5 bg-[#282828] px-1 text-[11px] font-bold text-sub">Description</span>
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} placeholder="Add an optional description" className="h-full min-h-[120px] w-full resize-none rounded bg-white/10 p-3 text-[14px] outline-none focus:bg-[#333] focus:ring-1 focus:ring-white/40" />
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <motion.button type="submit" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="h-12 rounded-full bg-white px-8 text-[15px] font-bold text-black">
                Save
              </motion.button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
