'use client';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useOwner } from '@/store/owner';
import { toast } from '@/store/ui';
import { IconCheckCircle, IconRefresh, IconTelegram } from '@/components/ui/Icons';

const field = 'h-11 w-full rounded-md bg-white/10 px-3 text-[15px] text-white outline-none placeholder:text-dim focus:bg-[#333] focus:ring-1 focus:ring-white/50';
const primary = 'h-11 shrink-0 rounded-full bg-white px-6 text-[14px] font-bold text-black transition-transform hover:scale-[1.03] active:scale-[.97] disabled:opacity-50 disabled:hover:scale-100';

/**
 * Connects the server to the owner's Telegram account: phone number, then the code Telegram
 * sends, then the two-step verification password if the account has one.
 */
export default function TelegramConnect({ compact }: { compact?: boolean }) {
  const tg = useOwner((s) => s.tg);
  const act = useOwner((s) => s.tgAction);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmOut, setConfirmOut] = useState(false);

  useEffect(() => {
    if (!tg) void useOwner.getState().refreshTg();
  }, [tg]);
  useEffect(() => {
    if (!confirmOut) return;
    const t = setTimeout(() => setConfirmOut(false), 4000);
    return () => clearTimeout(t);
  }, [confirmOut]);

  const run = async (body: Record<string, string>) => {
    setBusy(true);
    setErr('');
    const r = await act(body);
    setBusy(false);
    if (r.error) setErr(r.error);
  };

  if (!tg) return <div className="h-[92px] rounded-lg shimmer" />;

  if (!tg.configured)
    return (
      <Box>
        <p className="text-[14px] text-sub">
          Telegram isn’t set up on the server. Add <code className="text-white">TELEGRAM_API_ID</code> and <code className="text-white">TELEGRAM_API_HASH</code> to <code className="text-white">web/.env.local</code> and restart it.
        </p>
      </Box>
    );

  if (tg.connected)
    return (
      <div className={`flex items-center gap-3 rounded-lg bg-white/[.06] ${compact ? 'px-3 py-2.5' : 'p-4'}`}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#2aabee] text-white">
          <IconTelegram size={20} />
        </span>
        <div className="min-w-0 flex-1 text-[13px] leading-snug">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <IconCheckCircle size={15} className="text-[#7fd08a]" /> Telegram connected
          </div>
          <div className="truncate text-sub">
            {tg.me?.name}
            {tg.me?.username ? ` (@${tg.me.username})` : ''} · {tg.channel ? `channel “${tg.channel}”` : 'a private channel is created on the first upload'}
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          data-tip="Rebuild the song list from the channel"
          aria-label="Re-sync from Telegram"
          onClick={async () => {
            setBusy(true);
            const r = await act({ action: 'resync' });
            setBusy(false);
            if (r.error) toast(r.error);
            else if (r.resync) toast(`Re-synced: ${r.resync.total} upload${r.resync.total === 1 ? '' : 's'} in Telegram (${r.resync.added} added, ${r.resync.removed} removed).`);
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sub hover:bg-white/10 hover:text-white disabled:animate-spin"
        >
          <IconRefresh size={16} />
        </button>
        <button
          type="button"
          onClick={() => (confirmOut ? void useOwner.getState().tgSignOut() : setConfirmOut(true))}
          className={`h-8 shrink-0 rounded-full px-3 text-[12px] font-bold transition-colors ${confirmOut ? 'bg-accent text-white' : 'text-sub hover:bg-white/10 hover:text-white'}`}
        >
          {confirmOut ? 'Sign out?' : 'Disconnect'}
        </button>
      </div>
    );

  const step = tg.login?.step;
  return (
    <Box>
      {!step && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run({ action: 'code', phone });
          }}
        >
          <p className="mb-3 text-[14px] text-sub">Uploads are stored in your Telegram account. Sign in once with the phone number of the account to use; the server keeps the session.</p>
          <div className="flex gap-2">
            <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" aria-label="Phone number" autoFocus />
            <button type="submit" className={primary} disabled={busy || phone.replace(/\D/g, '').length < 7}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </div>
        </form>
      )}
      {step === 'code' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run({ action: 'verify', code });
          }}
        >
          <p className="mb-3 text-[14px] text-sub">
            Enter the code Telegram sent {tg.login!.viaApp ? 'to your Telegram app' : 'by SMS'} for <b className="text-white">{tg.login!.phone}</b>.
          </p>
          <div className="flex gap-2">
            <input className={field + ' tracking-[.3em]'} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="12345" aria-label="Login code" autoFocus />
            <button type="submit" className={primary} disabled={busy || code.replace(/\D/g, '').length < 4}>
              {busy ? 'Checking…' : 'Verify'}
            </button>
          </div>
          <button type="button" className="mt-2 text-[13px] text-sub underline-offset-2 hover:text-white hover:underline" onClick={() => void run({ action: 'cancel' })}>
            Use a different number
          </button>
        </form>
      )}
      {step === 'password' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run({ action: 'password', password: pw });
          }}
        >
          <p className="mb-3 text-[14px] text-sub">This account has two-step verification. Enter its password{tg.login!.hint ? ` (hint: ${tg.login!.hint})` : ''}.</p>
          <div className="flex gap-2">
            <input className={field} value={pw} onChange={(e) => setPw(e.target.value)} type="password" autoComplete="current-password" aria-label="Two-step verification password" autoFocus />
            <button type="submit" className={primary} disabled={busy || !pw}>
              {busy ? 'Checking…' : 'Continue'}
            </button>
          </div>
          <button type="button" className="mt-2 text-[13px] text-sub underline-offset-2 hover:text-white hover:underline" onClick={() => void run({ action: 'cancel' })}>
            Start again
          </button>
        </form>
      )}
      {(err || tg.error) && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-[13px] font-semibold text-accent-hi" role="alert">
          {err || tg.error}
        </motion.p>
      )}
    </Box>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/[.06] p-4">
      <div className="mb-3 flex items-center gap-2 text-[15px] font-bold">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#2aabee] text-white">
          <IconTelegram size={16} />
        </span>
        Connect Telegram
      </div>
      {children}
    </div>
  );
}

export function OwnerSignIn({ onDone }: { onDone?: () => void }) {
  const signIn = useOwner((s) => s.signIn);
  const configured = useOwner((s) => s.configured);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <form
      className="w-full"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr('');
        const r = await signIn(pw);
        setBusy(false);
        if (r) setErr(r);
        else onDone?.();
      }}
    >
      <label className="relative block">
        <span className="absolute -top-2 left-2.5 bg-[#282828] px-1 text-[11px] font-bold text-sub">Owner password</span>
        <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" autoComplete="current-password" autoFocus className={field} />
      </label>
      {!configured && <p className="mt-2 text-[13px] text-sub">Set OWNER_PASSWORD in web/.env.local and restart the server first.</p>}
      {err && (
        <p className="mt-2 text-[13px] font-semibold text-accent-hi" role="alert">
          {err}
        </p>
      )}
      <button type="submit" className={primary + ' mt-4 w-full'} disabled={busy || !pw}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
