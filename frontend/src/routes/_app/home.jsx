import { useEffect, useState, useRef } from 'react';

import { createFileRoute } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';

import { Button } from '@/components/ui/button.jsx';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave';
import { VersionPicker } from '@/components/ui/version-picker';

import { StartGame } from '../../../wailsjs/go/main/App';

import { useAuth } from '@/stores/auth';
import { copyText } from '@/lib/backend';

export const Route = createFileRoute('/_app/home')({
  component: HomePage,
});

function HomePage() {
  const { profile } = useAuth();
  const username = profile?.name ?? 'player';

  const [version, setVersion] = useState('1.14');

  const [copiedUUID, setCopiedUUID] = useState(false);

  const handleCopyUUID = async () => {
    if (!profile?.id) return;

    const wasCopied = await copyText(profile.id);
    if (!wasCopied) return;

    setCopiedUUID(true);
    window.setTimeout(() => setCopiedUUID(false), 1500);
  };

  const [uuidHover, setUuidHover] = useState(false);

  const handleUuidEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    setUuidHover(true);
  };

  const handleUuidLeave = () => setUuidHover(false);

  useEffect(() => {
    const onBlur = () => setCopiedUUID(false);
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const statusTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  const FINAL_STATUS = 'Game files downloaded and verified.';

  const handleDownload = async () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setIsLoading(true);
    setStatus('Downloading game files...');

    try {
      await StartGame(version);
      setStatus(FINAL_STATUS);
      statusTimerRef.current = setTimeout(() => {
        setStatus((s) => (s === FINAL_STATUS ? '' : s));
      }, 5000);
    } catch (error) {
      console.error('Failed to download:', error);
      setStatus(`Error: ${error?.message ?? String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid h-full w-full grid-cols-[70fr_30fr] gap-5 p-6">
      {/* LEFT COLLUMN */}
      <div className="grid h-full w-full grid-rows-[65fr_35fr] gap-y-5">
        {/* Hero card */}
        <div className="border-saturn-950 relative flex h-full w-full flex-col items-center justify-center gap-10 rounded-md border-2 px-6">
          {/* Top-left greeting */}
          <div className="absolute top-6 left-6 flex flex-col items-start gap-1">
            <p className="text-muted-foreground text-sm font-thin tracking-[0.2em] uppercase">
              Welcome back,{' '}
            </p>
            <p className="text-foreground text-4xl font-extralight tracking-tight">
              {username}
            </p>
          </div>
          {/* Top-right version picker */}
          <div className="absolute top-6 right-6">
            <VersionPicker value={version} onChange={setVersion} />
          </div>
          <Button
            variant="outline"
            className="group border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 h-11 gap-2 rounded-lg border px-6 font-thin transition-colors"
            onClick={handleDownload}
            disabled={isLoading}
          >
            {isLoading ? (
              'Downloading...'
            ) : (
              <>
                Launch Minecraft
                <span
                  aria-hidden="true"
                  className="text-saturn-300 transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </>
            )}
          </Button>
          <AnimatePresence>
            {status && (
              <motion.div
                key={status}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.25 }}
                className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6"
              >
                {status === FINAL_STATUS ? (
                  <p className="text-muted-foreground text-center text-sm font-thin">
                    {status}
                  </p>
                ) : (
                  <TextShimmerWave
                    className="text-sm font-thin [--base-color:#71717a] [--base-gradient-color:#a18dec]"
                    duration={0.35}
                    spread={0.7}
                    zDistance={0}
                    scaleDistance={1}
                    rotateYDistance={15}
                  >
                    {status}
                  </TextShimmerWave>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-saturn-950 flex h-full w-full flex-col items-center justify-center gap-10 rounded-md border-2 px-6">
          <p>placeholder but cooler</p>
        </div>
      </div>
      <div className="grid h-full w-full grid-rows-[auto_1fr] gap-y-5">
        {/* Top: Player Pane — sized by the render */}
        <div className="border-saturn-950 @container flex w-full items-stretch gap-4 rounded-md border-2 p-6">
          <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-1">
            <p className="text-muted-foreground text-sm font-thin tracking-[0.2em] uppercase">
              Player Pane
            </p>
            <p className="text-foreground text-[clamp(1rem,17cqw,6rem)] font-extralight tracking-tight">
              {username}
            </p>
            <div className="flex w-full min-w-0 overflow-hidden">
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
                {copiedUUID ? 'Copied UUID!' : profile.id}
              </button>
            </div>
          </div>

          <img
            src={`https://render.crafty.gg/3d/full/${username}?width=300&height=360&x=30&z=50`}
            alt=""
            draggable={false}
            className="block h-auto w-1/3 shrink-0 self-center"
          />
        </div>

        {/* Bottom: HELLO */}
        <div className="border-saturn-950 flex items-center justify-center rounded-md border-2">
          <h1 className="text-5xl font-extrabold">Placeholder</h1>
        </div>
      </div>
    </div>
  );
}
