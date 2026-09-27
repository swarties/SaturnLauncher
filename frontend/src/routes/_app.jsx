import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from '@tanstack/react-router';
import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { GlassNavbar } from '@glinui/ui';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

const NAV_ITEMS = [
  { to: '/home', label: 'Home' },
  { to: '/settings', label: 'Settings' },
];

const PAGE_ANIMATE = { x: '0', opacity: 1, filter: 'blur(0px)' };
const PAGE_TRANSITION = { duration: 0.55, ease: [0.22, 1, 0.38, 1] };

function getDirection(currentPath, prevPath) {
  if (currentPath === prevPath) return 'forward';

  const currentIndex = NAV_ITEMS.findIndex((item) => item.to === currentPath);
  const prevIndex = NAV_ITEMS.findIndex((item) => item.to === prevPath);

  if (currentIndex === -1 || prevIndex === -1) return 'forward';

  return currentIndex > prevIndex ? 'forward' : 'backward';
}

function NavLink({ to, label }) {
  return (
    <Link
      to={to}
      className="text-foreground/60 hover:bg-saturn-900/30 hover:text-foreground rounded-sm px-3 py-2.5 text-sm font-thin tracking-wide transition-colors"
      activeProps={{
        className: 'bg-saturn-900/60 text-foreground',
      }}
    >
      {label}
    </Link>
  );
}

function AppLayout() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  const direction = getDirection(location.pathname, prevPathRef.current);

  useEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  return (
    <div className="bg-background relative flex h-screen w-full flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="bg-saturn-800/15 absolute -top-48 left-1/2 h-144 w-4xl -translate-x-1/2 rounded-full blur-[120px]" />
        <div className="bg-saturn-900/30 absolute -right-32 bottom-0 h-112 w-160 rounded-full blur-[100px]" />
        <div className="bg-saturn-950/50 absolute top-1/3 -left-32 h-96 w-lg rounded-full blur-[90px]" />
      </div>
      <header className="relative z-10 px-4 pt-4">
        <GlassNavbar
          size="md"
          disableScrollTracking
          className="flex items-center justify-between gap-6 rounded-2xl px-4"
        >
          <span className="text-saturn-400 text-sm font-thin tracking-[0.2em] uppercase">
            Saturn
          </span>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} label={item.label} />
            ))}
          </nav>
        </GlassNavbar>
      </header>

      <main className="relative z-10 flex-1 overflow-hidden">
        <motion.div
          key={location.pathname}
          initial={{
            x: direction === 'forward' ? '100%' : '-100%',
            opacity: 0.7,
            filter: 'blur(6px)',
          }}
          animate={PAGE_ANIMATE}
          transition={PAGE_TRANSITION}
          className="h-full w-full"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
