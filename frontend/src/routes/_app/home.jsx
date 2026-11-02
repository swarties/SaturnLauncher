import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { createFileRoute } from '@tanstack/react-router';
import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react';

import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  Loader2,
  ScrollText,
  Square,
} from 'lucide-react';

import { Button } from '@/components/ui/button.jsx';
import { InstanceSelector } from '@/components/ui/instance-selector.jsx';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave';

import { useAuth } from '@/stores/auth';
import {
  clearError,
  startLaunch,
  stopLaunch,
  useLaunch,
} from '@/stores/launch';
import { copyText } from '@/lib/backend';
import { GetLatestCrash } from '../../../wailsjs/go/main/App';

export const Route = createFileRoute('/_app/home')({
  component: HomePage,
});

function HomePage() {
  const { profile } = useAuth();
  const username = profile?.name ?? 'player';

  const { instances } = useLaunch();

  const [selectedInstance, setSelectedInstance] = useState(
    /** @type {import('@/components/ui/instance-selector.jsx').McInstance} | null */ (
      null
    )
  );

  const uuid = selectedInstance?.uuid ?? null;
  const launchState = uuid ? instances[uuid] : null;
  const phase = launchState?.phase ?? 'idle';
  const progress = launchState?.progress ?? 0;
  const status = launchState?.status ?? '';
  const statusKind = launchState?.statusKind ?? 'idle';

  const isLaunching = phase === 'launching';
  const isRunning = phase === 'running';
  const isError = phase === 'error' || phase === 'crashed';

  const smoothProgress = useSpring(progress, {
    stiffness: 90,
    damping: 20,
    mass: 0.5,
  });
  const smoothWidth = useTransform(smoothProgress, (v) => `${v}%`);

  useEffect(() => {
    smoothProgress.set(progress);
  }, [progress, smoothProgress]);

  const navigate = Route.useNavigate();

  const handleLaunch = () => {
    if (!uuid || isLaunching || isRunning) return;
    void startLaunch(uuid);
  };

  const handleViewLogs = () => {
    if (!uuid) return;
    void navigate({ to: `/instances/${uuid}` });
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

          <div className="flex w-full max-w-xs flex-col items-center gap-3">
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex justify-end">
                <AnimatePresence>
                  {(isLaunching || isRunning) && (
                    <motion.button
                      key="logs-button"
                      type="button"
                      onClick={handleViewLogs}
                      data-tooltip="View logs"
                      initial={{ opacity: 0, scale: 0.5, x: '50%' }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.5, x: '50%' }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="flex size-11 items-center justify-center rounded-lg border border-(--surface-border) bg-transparent text-(--saturn-fg-muted) transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) hover:text-(--saturn-fg-strong)"
                    >
                      <ScrollText
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              <Button
                variant="outline"
                className="group border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 h-11 min-w-44 gap-2 rounded-lg border px-6 font-thin transition-colors"
                onClick={handleLaunch}
                disabled={isLaunching || isRunning || !selectedInstance}
              >
                {isRunning ? (
                  'Game Running...'
                ) : isLaunching ? (
                  'Launching...'
                ) : (
                  <>
                    Launch Minecraft
                    <ArrowRight
                      aria-hidden="true"
                      className="text-saturn-300 size-4 transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </>
                )}
              </Button>
              <div className="flex justify-start">
                <AnimatePresence>
                  {isRunning && (
                    <motion.button
                      key="kill-button"
                      type="button"
                      onClick={() => stopLaunch(uuid)}
                      aria-label="Stop Game"
                      data-tooltip="Force Stop"
                      initial={{ opacity: 0, scale: 0.5, x: '-50%' }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.5, x: '-50%' }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="flex size-11 items-center justify-center rounded-lg border border-(--danger-border) bg-(--danger-bg) text-(--danger-fg) transition-colors hover:border-(--danger-border-hover) hover:bg-(--danger-bg-hover) hover:text-(--danger-fg-hover)"
                    >
                      <Square
                        className="size-4 fill-current"
                        aria-hidden="true"
                      />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex h-6 w-full items-center justify-center">
              <AnimatePresence>
                {isLaunching && (
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
            {status && !isError && (
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
                    key={status}
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

          <LaunchErrorDialog uuid={uuid} />
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

const EASE = [0.22, 1, 0.38, 1];

function LaunchErrorDialog({ uuid }) {
  const { instances } = useLaunch();
  const launchState = uuid ? instances[uuid] : null;
  const phase = launchState?.phase;
  const isOpen = phase === 'error' || phase === 'crashed';
  const status = launchState?.status ?? '';

  const [viewMode, setViewMode] = useState('error');
  const [crashLog, setCrashLog] = useState(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setViewMode('error');
        setCrashLog(null);
        setCopied(false);
      }, 300);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (uuid) clearError(uuid);
  };

  const handleViewLog = async () => {
    if (!uuid || loadingLog) return;
    setLoadingLog(true);
    setViewMode('log');
    try {
      const log = await GetLatestCrash(uuid);
      setCrashLog(log || 'No crash report found.');
    } catch (e) {
      setCrashLog(`Failed to load crash report:\n${e?.message ?? String(e)}`);
    } finally {
      setLoadingLog(false);
    }
  };

  const handleCopy = async () => {
    if (!crashLog) return;
    const success = await copyText(crashLog);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
        >
          <motion.div
            key="launch-error-panel"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { duration: 0.28, ease: EASE },
            }}
            exit={{
              opacity: 0,
              y: 8,
              scale: 0.97,
              transition: { duration: 0.2, ease: EASE },
            }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-background relative w-full overflow-hidden rounded-md border-2 border-(--danger-border) transition-all duration-300 ${
              viewMode === 'log' ? 'max-w-2xl' : 'max-w-md'
            }`}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
            >
              <div className="absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-(--orb-1) blur-[80px]" />
              <div className="absolute -right-16 -bottom-16 h-48 w-64 rounded-full bg-(--orb-2) blur-[70px]" />
              <div className="absolute top-1/2 -left-24 h-40 w-56 rounded-full bg-(--orb-3) blur-[70px]" />
            </div>
            <div className="relative z-10 flex flex-col p-6">
              {viewMode === 'error' ? (
                <>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--danger-border) bg-(--danger-bg) text-(--danger-fg)">
                      <AlertTriangle className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-normal tracking-[0.2em] text-(--danger-fg) uppercase">
                        {phase === 'crashed' ? 'Game Crashed' : 'Launch Failed'}
                      </p>
                      <p className="text-muted-foreground mt-2 text-sm font-normal break-words whitespace-pre-wrap">
                        {status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleViewLog}
                      className="flex h-10 items-center gap-2 rounded-md border border-(--surface-border) px-4 text-sm font-thin transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover)"
                    >
                      <ScrollText className="size-4" />
                      View Crash Log
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="h-10 rounded-md border border-(--danger-border) bg-(--danger-bg) px-6 text-sm font-thin text-(--danger-fg) transition-colors hover:border-(--danger-border-hover) hover:bg-(--danger-bg-hover) hover:text-(--danger-fg-hover)"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-normal tracking-[0.2em] text-(--danger-fg) uppercase">
                      Crash Report
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopy}
                        disabled={loadingLog || !crashLog}
                        data-tooltip="Copy to clipboard"
                        className="text-muted-foreground flex size-8 items-center justify-center rounded-md border border-(--surface-border) transition-colors hover:bg-(--surface-hover) hover:text-(--saturn-fg) disabled:pointer-events-none disabled:opacity-40"
                      >
                        {copied ? (
                          <Check className="size-4 text-emerald-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('error')}
                        className="flex h-8 items-center justify-center rounded-md border border-(--surface-border) px-3 text-xs font-thin transition-colors hover:bg-(--surface-hover)"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 min-h-32">
                    {loadingLog ? (
                      <div className="flex h-32 items-center justify-center">
                        <Loader2 className="text-saturn-500 size-6 animate-spin" />
                      </div>
                    ) : (
                      <pre className="max-h-[60vh] overflow-y-auto rounded-md border border-(--hairline) bg-(--log-bg) p-4 font-mono text-xs whitespace-pre-wrap text-(--saturn-fg) select-text">
                        {crashLog}
                      </pre>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
