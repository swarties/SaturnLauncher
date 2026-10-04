import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from '@tanstack/react-router';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import { MOCK_INSTANCE } from '@/lib/mock-instance.js';
import { onBackendEvent } from '@/lib/backend.js';
import {
  loadInstance,
  refreshInstance,
  useInstance,
} from '@/stores/instance.js';

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
  const navRef = useRef(null);
  const [pill, setPill] = useState({ top: 0, height: 0, ready: false });
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const { data: instance } = useInstance();

  useEffect(() => {
    loadInstance(uuid);
  }, [uuid]);

  useEffect(() => {
    const off = onBackendEvent('instance:changed', refreshInstance);
    return () => {
      if (typeof off === 'function') off();
    };
  }, []);

  const activeIndex = TABS.findIndex((tab) => pathname.endsWith(`/${tab.to}`));
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
      transition={{ duration: 0.4, ease: [0.22, 1, 0.38, 1] }}
      className="flex h-full w-full gap-4 p-6"
    >
      {/* Sidebar */}
      <aside className="flex h-full w-64 shrink-0 flex-col">
        {/* Identity card — sits at the same top edge as the content panel */}
        <div className="flex flex-col gap-3 rounded-md border-2 border-(--surface-border) p-4">
          <img
            src={MOCK_INSTANCE.icon}
            alt=""
            draggable={false}
            className="h-16 w-16 rounded-md"
          />
          <div className="flex flex-col gap-0.5">
            <p className="text-foreground text-lg font-extralight tracking-tight">
              {instance?.name ?? '_'}
            </p>
            <p className="text-muted-foreground text-xs font-thin tracking-[0.2em] uppercase">
              {instance?.version ?? '_'}
            </p>
          </div>
          <p className="text-muted-foreground line-clamp-4 text-xs font-thin">
            {MOCK_INSTANCE.description}
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
          ← Instances
        </Link>
      </aside>

      {/* Content — bordered panel, scrolls internally */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-md border-2 border-(--surface-border)">
        <div className="h-full w-full overflow-y-auto p-8">
          <Outlet />
        </div>
      </div>
    </motion.div>
  );
}
