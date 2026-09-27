import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from '@tanstack/react-router';
import { motion } from 'motion/react';
import {
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
} from 'react';
import { GlassNavbar } from '@glinui/ui';
import { useAuth } from '@/stores/auth';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

const NAV_ITEMS = [
  { to: '/home', label: 'Home' },
  { to: '/instances', label: 'Instances' },
  { to: '/account', label: 'Account' },
  { to: '/settings', label: 'Settings' },
];

const PAGE_ANIMATE = { x: '0', opacity: 1, filter: 'blur(0px)' };
const PAGE_TRANSITION = { duration: 0.55, ease: [0.22, 1, 0.38, 1] };

const PILL_TRANSITION = {
  type: 'spring',
  stiffness: 400,
  damping: 35,
};

function getDirection(currentPath, prevPath) {
  if (currentPath === prevPath) return 'forward';

  const currentIndex = NAV_ITEMS.findIndex((item) => item.to === currentPath);
  const prevIndex = NAV_ITEMS.findIndex((item) => item.to === prevPath);

  if (currentIndex === -1 || prevIndex === -1) return 'forward';

  return currentIndex > prevIndex ? 'forward' : 'backward';
}

function NavLink({ to, label, index, onHover }) {
  return (
    <Link
      to={to}
      draggable={false}
      data-nav-index={index}
      data-tooltip={label}
      onMouseEnter={onHover}
      className="text-foreground/60 hover:text-foreground relative z-10 rounded-sm px-3 py-2.5 text-sm font-thin tracking-wide transition-colors select-none"
      activeProps={{
        className: 'text-foreground',
      }}
    >
      {label}
    </Link>
  );
}

function NavBar({ pathname }) {
  const navRef = useRef(null);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const activeIndex = NAV_ITEMS.findIndex((item) => item.to === pathname);
  const targetIndex = hoveredIndex ?? activeIndex;

  const measure = useCallback(() => {
    const nav = navRef.current;
    if (!nav || targetIndex === -1) return;

    const el = nav.querySelector(`[data-nav-index="${targetIndex}"]`);
    if (!el) return;

    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    setPill({
      left: elRect.left - navRect.left,
      width: elRect.width,
      ready: true,
    });
  }, [targetIndex]);

  useLayoutEffect(() => {
    measure();
  }, [measure, pathname]);

  useEffect(() => {
    const fonts = document.fonts;
    if (!fonts?.ready) return;

    let cancelled = false;
    fonts.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
    };
  }, [measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  return (
    <nav
      ref={navRef}
      onMouseLeave={() => setHoveredIndex(null)}
      className="relative flex items-center gap-1 select-none"
    >
      {pill.ready && (
        <motion.div
          aria-hidden="true"
          className="bg-saturn-900/60 pointer-events-none absolute inset-y-0 rounded-sm"
          initial={false}
          animate={{ left: pill.left, width: pill.width }}
          transition={PILL_TRANSITION}
        />
      )}
      {NAV_ITEMS.map((item, index) => (
        <NavLink
          key={item.to}
          to={item.to}
          label={item.label}
          index={index}
          onHover={() => setHoveredIndex(index)}
        />
      ))}
    </nav>
  );
}

function AppLayout() {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const { profile } = useAuth();

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
          className="relative flex items-center justify-between gap-6 rounded-2xl px-4 select-none"
        >
          <span className="text-saturn-400 text-sm font-thin tracking-[0.2em] uppercase">
            Saturn
          </span>

          {profile && (
            <div className="border-saturn-700/40 bg-saturn-900/40 absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-sm border py-1.5 pr-3 pl-1">
              <img
                src={`https://mc-heads.net/avatar/${profile.id}`}
                alt=""
                draggable="false"
                className="h-7 w-7 rounded-full"
              />
              <span className="text-saturn-100 text-sm font-thin tracking-wide">
                {profile.name}
              </span>
            </div>
          )}

          <NavBar pathname={location.pathname}></NavBar>
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
