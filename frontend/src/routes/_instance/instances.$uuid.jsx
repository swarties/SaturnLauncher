import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from '@tanstack/react-router';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import { ChevronLeft, LoaderCircle, Play, Square } from 'lucide-react';

import { onBackendEvent } from '@/lib/backend.js';
import {
  loadInstance,
  refreshInstance,
  useInstance,
} from '@/stores/instance.js';
import { startLaunch, stopLaunch, useLaunch } from '@/stores/launch';

import minecraftLogo from '@/assets/logos/minecraft.png';
import fabricLogo from '@/assets/logos/fabric.png';

export const Route = createFileRoute('/_instance/instances/$uuid')({
  component: InstanceDetailLayout,
});

const TABS = [
  { to: 'logs', label: 'Logs' },
  { to: 'mods', label: 'Mods' },
  { to: 'resourcepacks', label: 'Resource Packs' },
  { to: 'shaderpacks', label: 'Shader packs' },
  { to: 'screenshots', label: 'Screenshots' },
  { to: 'settings', label: 'Settings' },
];

const PILL_TRANSITION = { type: 'spring', stiffness: 400, damping: 35 };

function InstanceDetailLayout() {
  const { uuid } = Route.useParams();
  const { pathname } = useLocation();
  const activeTab = pathname.split('/').pop() || 'settings';

  const prevTabRef = useRef(activeTab);
  const isInitialTabRef = useRef(true);

  const activeIndex = TABS.findIndex((tab) => tab.to === activeTab);
  const prevIndex = TABS.findIndex((tab) => tab.to === prevTabRef.current);
  const direction = activeIndex < prevIndex ? 'up' : 'down';

  useEffect(() => {
    prevTabRef.current = activeTab;
    isInitialTabRef.current = false;
  }, [activeTab]);

  const navRef = useRef(null);
  const [pill, setPill] = useState({ top: 0, height: 0, ready: false });
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const { data: instance, iconDataUrl } = useInstance();
  const { instances } = useLaunch();
  const launchState = instances[uuid];
  const phase = launchState?.phase ?? 'idle';
  const isLaunching = phase === 'launching';
  const isRunning = phase === 'running';

  const handleLaunchToggle = () => {
    if (isLaunching) return;
    if (isRunning) {
      void stopLaunch(uuid);
    } else {
      void startLaunch(uuid);
    }
  };

  const iconSrc = iconDataUrl
    ? `data:image/png;base64,${iconDataUrl}`
    : instance?.fabricVersion
      ? fabricLogo
      : minecraftLogo;

  const [canAnimate, setCanAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCanAnimate(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    loadInstance(uuid);
  }, [uuid]);

  useEffect(() => {
    const off = onBackendEvent('instance:changed', refreshInstance);
    return () => {
      if (typeof off === 'function') off();
    };
  }, []);

  const targetIndex = hoveredIndex ?? activeIndex;

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || targetIndex === -1) return;

    const el = nav.querySelector(`[data-tab-index="${targetIndex}"]`);
    if (!el) return;

    setPill({ top: el.offsetTop, height: el.offsetHeight, ready: true });
  }, [targetIndex]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.38, 1] }}
      className="flex h-full w-full gap-4 p-6"
    >
      {/* Sidebar */}
      <aside className="flex h-full w-64 shrink-0 flex-col">
        {/* Identity card — sits at the same top edge as the content panel */}

        <div className="relative flex flex-col gap-3 rounded-md border-2 border-(--surface-border) p-4">
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={handleLaunchToggle}
              disabled={isLaunching}
              data-tooltip={
                isRunning
                  ? 'Stop Game'
                  : isLaunching
                    ? 'Launching...'
                    : 'Launch'
              }
              className={[
                'flex size-12 items-center justify-center rounded-lg border transition-all duration-300 disabled:pointer-events-none',
                isRunning
                  ? 'border-(--danger-border) bg-(--danger-bg) text-(--danger-fg) hover:border-(--danger-border-hover) hover:bg-(--danger-bg-hover) hover:text-(--danger-fg-hover)'
                  : isLaunching
                    ? 'border-(--surface-border) bg-(--surface-active) text-(--saturn-fg-muted)'
                    : 'border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50',
              ].join(' ')}
            >
              {isRunning ? (
                <Square className="size-4 fill-current" aria-hidden="true" />
              ) : isLaunching ? (
                <LoaderCircle
                  className="size-5 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Play
                  className="ml-0.5 size-5 fill-current"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
          <img src={iconSrc} alt="" className="h-16 w-16 rounded-md" />
          <div className="flex flex-col gap-0.5">
            <p className="text-foreground truncate text-lg font-extralight tracking-tight">
              {instance?.name ?? '_'}
            </p>
            <p className="text-muted-foreground text-xs font-thin tracking-[0.2em] uppercase">
              {instance?.version ?? '_'}
            </p>
          </div>
          <p className="text-muted-foreground line-clamp-4 text-xs font-thin">
            {instance?.description}
          </p>
        </div>

        {/* Tabs */}
        <nav
          ref={navRef}
          onMouseLeave={() => setHoveredIndex(null)}
          className="relative mt-3 flex flex-col gap-1.5 select-none"
        >
          {pill.ready && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 rounded-md bg-(--surface-active)"
              initial={false}
              animate={{ top: pill.top, height: pill.height }}
              transition={PILL_TRANSITION}
            />
          )}
          {TABS.map((tab, index) => (
            <Link
              key={tab.to}
              to={`/instances/$uuid/${tab.to}`}
              params={{ uuid }}
              data-tab-index={index}
              data-tooltip={tab.label}
              onMouseEnter={() => setHoveredIndex(index)}
              className="relative z-10 rounded-md border border-(--hairline) px-4 py-2.5 text-sm font-thin tracking-wide text-(--nav-link-fg) transition-colors select-none hover:border-(--surface-border-hover) hover:text-(--nav-link-fg-hover)"
              activeProps={{
                className: 'text-foreground border-(--surface-border-hover)',
              }}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* Back button — pinned to bottom of the sidebar */}
        <Link
          to="/instances"
          data-tooltip="Back to instances"
          className="mt-auto flex items-center justify-center gap-2 rounded-md border border-(--hairline) px-4 py-2.5 text-sm font-thin tracking-wide text-(--nav-link-fg) transition-colors hover:border-(--surface-border-hover) hover:text-(--nav-link-fg-hover)"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Instances
        </Link>
      </aside>

      {/* Content — bordered panel, scrolls internally */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-md border-2 border-(--surface-border)">
        <motion.div
          key={activeTab}
          initial={
            canAnimate
              ? {
                  y: direction === 'down' ? '100%' : '-100%',
                  opacity: 0.8,
                }
              : false
          }
          animate={{ y: '0', opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.38, 1] }}
          className="h-full w-full"
        >
          <div className="h-full w-full overflow-y-auto p-8">
            <Outlet />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
