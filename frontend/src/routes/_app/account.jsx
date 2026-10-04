import { useEffect, useState } from 'react';

import { createFileRoute } from '@tanstack/react-router';
import { motion } from 'motion/react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/stores/auth';
import { copyText, logout, openExternalURL } from '@/lib/backend';

export const Route = createFileRoute('/_app/account')({
  component: AccountPage,
});

function AccountPage() {
  const { profile } = useAuth();
  const username = profile?.name ?? 'player';

  const [copiedUUID, setCopiedUUID] = useState(false);

  const handleCopyUUID = async () => {
    if (!profile?.id) return;
    const wasCopied = await copyText(profile.id);
    if (!wasCopied) return;
    setCopiedUUID(true);
    window.setTimeout(() => setCopiedUUID(false), 1000);
  };

  const [uuidHover, setUuidHover] = useState(false);

  const handleUuidEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    setUuidHover(true);
  };

  const handleUuidLeave = () => setUuidHover(false);

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    try {
      await logout();
    } catch (e) {
      console.error('Logout failed:', e);
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    const onBlur = () => setCopiedUUID(false);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex w-full max-w-3xl items-stretch gap-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.38, 1] }}
          className="flex-8 rounded-md border-2 border-(--surface-border) p-8"
        >
          <p className="text-muted-foreground text-sm font-thin tracking-[0.2em] uppercase">
            Account
          </p>
          <div className="mt-6 flex items-center gap-6">
            <img
              src={`https://mc-heads.net/avatar/${profile?.id ?? 'steve'}/128`}
              alt=""
              draggable={false}
              className="h-24 w-24 rounded-md"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-foreground text-3xl font-extralight tracking-tight">
                {username}
              </p>
              <div className="flex min-w-0 overflow-hidden">
                <p className="text-muted-foreground shrink-0 text-xs font-thin tracking-[0.2em] uppercase">
                  UUID:
                </p>
                <button
                  type="button"
                  data-tooltip="Copy UUID"
                  onClick={handleCopyUUID}
                  onMouseEnter={handleUuidEnter}
                  onMouseLeave={handleUuidLeave}
                  style={{ '--mx': '50%' }}
                  className={[
                    'text-muted-foreground relative text-xs font-thin tracking-[0.2em] uppercase',
                    copiedUUID ? 'cursor-default' : 'cursor-pointer',
                    'after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-(--mx) after:bg-current after:transition-transform after:duration-200',
                    uuidHover ? 'after:scale-x-100' : 'after:scale-x-0',
                    copiedUUID ? 'after:opacity-0' : 'after:opacity-100',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {copiedUUID ? 'Copied UUID!' : profile?.id}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 border-t border-(--divider) pt-6 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() =>
                openExternalURL('https://www.minecraft.net/en-us/msaprofile')
              }
              className="h-12 justify-start rounded-lg border-(--chip-border) bg-(--chip-bg) px-6 font-thin text-(--chip-fg) hover:border-(--chip-border-hover) hover:bg-(--chip-bg-hover) hover:text-(--chip-fg-hover)"
            >
              Manage on minecraft.net{' '}
              <span aria-hidden="true" className="text-saturn-400 ml-auto">
                ↗
              </span>
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={loggingOut}
              className="h-12 justify-start gap-2 rounded-lg border-(--danger-border) bg-(--danger-bg) px-6 font-thin text-(--danger-fg) hover:border-(--danger-border-hover) hover:bg-(--danger-bg-hover) hover:text-(--danger-fg-hover) disabled:pointer-events-none disabled:opacity-40"
            >
              {loggingOut ? 'Logging out...' : 'Log Out'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="ml-auto size-4 shrink-0"
              >
                <path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" />
                <path d="M9 12h12l-3 -3" />
                <path d="M18 15l3 -3" />
              </svg>
            </Button>
          </div>
        </motion.div>
        <button
          type="button"
          className="group flex min-h-48 flex-4 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-(--surface-border) transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) md:min-h-0"
        >
          <span
            aria-hidden="true"
            className="text-saturn-500 text-9xl leading-none font-extralight transition-colors group-hover:text-(--saturn-fg-strong)"
          >
            +
          </span>
          <span className="text-muted-foreground text-sm font-thin tracking-[0.2em] uppercase transition-colors group-hover:text-(--saturn-fg)">
            Add Account
          </span>
        </button>
      </div>
    </div>
  );
}
