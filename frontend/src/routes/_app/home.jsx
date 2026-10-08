import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { createFileRoute } from '@tanstack/react-router';
import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button.jsx';
import { InstanceSelector } from '@/components/ui/instance-selector.jsx';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave';

import { useAuth } from '@/stores/auth';
import { clearError, startLaunch, useLaunch } from '@/stores/launch';
import { copyText } from '@/lib/backend';

export const Route = createFileRoute('/_app/home')({
  component: HomePage,
});

function HomePage() {
  const { profile } = useAuth();
  const username = profile?.name ?? 'player';

  const { isLoading, progress, status, statusKind } = useLaunch();

  const smoothProgress = useSpring(progress, {
    stiffness: 90,
    damping: 20,
    mass: 0.5,
  });
  const smoothWidth = useTransform(smoothProgress, (v) => `${v}%`);

  useEffect(() => {
    smoothProgress.set(progress);
  }, [progress, smoothProgress]);

  const [selectedInstance, setSelectedInstance] = useState(
    /** @type {import('@/components/ui/instance-selector.jsx').McInstance | null} */ null
  );

  const handleLaunch = () => {
    if (!selectedInstance || isLoading) return;
    void startLaunch(selectedInstance.uuid);
  };

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

  return (
    <div className="grid h-full w-full grid-cols-[70fr_30fr] gap-5 p-6">
      {/* LEFT COLUMN */}
      <div className="grid h-full w-full grid-rows-[65fr_35fr] gap-y-5">
        {/* Hero card */}
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-10 rounded-md border-2 border-(--surface-border) px-6">
          {/* Top-left greeting */}
          <div className="absolute top-6 left-6 flex flex-col items-start gap-1">
            <p className="text-muted-foreground text-sm font-thin tracking-[0.2em] uppercase">
              Welcome back,{' '}
            </p>
            <p className="text-foreground text-4xl font-extralight tracking-tight">
              {username}
            </p>
          </div>

          {/**/}
          {/**/}

          <div className="flex w-full max-w-xs flex-col items-center gap-3">
            <Button
              variant="outline"
              className="group border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 h-11 min-w-44 gap-2 rounded-lg border px-6 font-thin transition-colors"
              onClick={handleLaunch}
              disabled={isLoading || !selectedInstance}
            >
              {isLoading ? (
                'Launching...'
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

            {/* Progress bar */}
            <div className="flex h-6 w-full items-center justify-center">
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    key="progress-track"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.3 } }}
                    exit={{ opacity: 0, transition: { duration: 0.7 } }}
                    className="relative h-1 w-full overflow-hidden rounded-full bg-(--hairline)"
                  >
                    <motion.div
                      className="from-saturn-700 to-saturn-400 h-full rounded-full bg-linear-to-r"
                      style={{ width: smoothWidth }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {status && statusKind !== 'error' && (
              <motion.div
                key="launch-status"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.25 }}
                className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6"
              >
                {statusKind === 'progress' ? (
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
                ) : (
                  <p className="text-muted-foreground text-center text-sm font-thin">
                    {status}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <LaunchErrorDialog />

          {/*  */}
          {/*  */}
        </div>

        <div className="flex h-full w-full flex-col items-center justify-center gap-10 rounded-md border-2 border-(--surface-border) px-6">
          <p>placeholder but cooler</p>
        </div>
      </div>

      <div className="grid h-full w-full grid-rows-[auto_1fr] gap-y-5">
        {/* Player Pane */}
        <div className="@container flex w-full items-stretch gap-4 rounded-md border-2 border-(--surface-border) p-6">
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
                {copiedUUID ? 'Copied UUID!' : profile?.id}
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

        {/* Instance selector */}
        <div className="flex min-h-0 flex-col rounded-md border-2 border-(--surface-border) p-6">
          <InstanceSelector onSelectionChange={setSelectedInstance} />
        </div>
      </div>
    </div>
  );
}

const ERROR_DIALOG_EASE = [0.22, 1, 0.38, 1];

function LaunchErrorDialog() {
  const { status, statusKind } = useLaunch();
  const isOpen = statusKind === 'error';

  const handleClose = () => {
    clearError();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="launch-error-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2 } }}
          exit={{ opacity: 0, transition: { duration: 0.35, delay: 0.05 } }}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-(--backdrop) p-6 backdrop-blur-sm"
        >
          <motion.div
            key="launch-error-panel"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { duration: 0.28, ease: ERROR_DIALOG_EASE },
            }}
            exit={{
              opacity: 0,
              y: 8,
              scale: 0.97,
              transition: { duration: 0.2, ease: ERROR_DIALOG_EASE },
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background relative w-full max-w-md overflow-hidden rounded-md border-2 border-(--danger-border)"
            role="dialog"
            aria-modal="true"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              <div className="absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-(--orb-1) blur-[80px]" />
              <div className="absolute -right-16 -bottom-16 h-48 w-64 rounded-full bg-(--orb-2) blur-[70px]" />
              <div className="absolute top-1/2 -left-24 h-40 w-56 rounded-full bg-(--orb-3) blur-[70px]" />
            </div>
            <div className="relative z-10 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--danger-border) bg-(--danger-bg) text-(--danger-fg)">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-normal tracking-[0.2em] text-(--danger-fg) uppercase">
                    Launch Failed
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm font-normal break-words whitespace-pre-wrap">
                    {status}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="h-10 rounded-md border border-(--danger-border) bg-(--danger-bg) px-6 text-sm font-thin text-(--danger-fg) transition-colors hover:border-(--danger-border-hover) hover:bg-(--danger-bg-hover) hover:text-(--danger-fg-hover)"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
