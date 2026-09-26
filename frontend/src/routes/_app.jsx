import {
  createFileRoute,
  Outlet,
  Link,
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

function getDirection(currentPath, prevPath) {
  if (currentPath === prevPath) return 'forward';

  const currentIndex = NAV_ITEMS.findIndex((item) => item.to === currentPath);
  const prevIndex = NAV_ITEMS.findIndex((item) => item.to === prevPath);

  if (currentIndex === -1 || prevIndex === -1) return 'forward';

  return currentIndex > prevIndex ? 'forward' : 'backward';
}

const pageVariants = {
  initial: (direction) => ({
    x: direction === 'forward' ? '100%' : '-100%',
    opacity: 0.7,
    filter: 'blur(6px',
  }),
  animate: {
    x: '0',
    opacity: 1,
    filter: 'blur(0px)',
  },
};

const pageTransition = {
  duration: 0.55,
  ease: [0.22, 1, 0.38, 1],
};

function NavLink({ to, label }) {
  return (
    <Link
      to={to}
      className="text-foreground/60 hover:bg-saturn-900/30 hover:text-foreground rounded-md px-3 py-1.5 text-sm font-thin tracking-wide transition-colors"
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
    <div className="relative flex h-screen w-full flex-col overflow-hidden">
      <GlassNavbar
        size="md"
        className="flex items-center justify-between gap-6 px-4"
      >
        <div className="flex items-center gap-6">
          <span className="text-saturn-400 text-sm font-thin tracking-[0.2em] uppercase">
            Saturn
          </span>
          <nav className="text-saturn-400 text-sm font-thin tracking-[0.2em] uppercase">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} label={item.label} />
            ))}
          </nav>
        </div>
      </GlassNavbar>

      <main className="flex-1 overflow-hidden">
        <motion.div
          key={location.pathname}
          custom={direction}
          variants={pageVariants}
          intial="initial"
          animate="animate"
          transition={pageTransition}
          className="h-full w-full"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
