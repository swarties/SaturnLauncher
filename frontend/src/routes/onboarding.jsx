import {
  useEffect,
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
} from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
import { GlassNavbar } from '@glinui/ui';
import { Button } from '@/components/ui/button.jsx';
import { LineWobble } from 'ldrs/react';
import 'ldrs/react/LineWobble.css';
import { hasOnboarded, setOnboarded } from '@/lib/onboarding';
import { useAuth } from '@/stores/auth';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave.jsx';
import { TextEffect } from '@/components/ui/text-effect.jsx';
import { NAV_ITEMS } from '@/lib/nav-items';

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
});

const PILL_TRANSITION = { type: 'spring', stiffness: 400, damping: 35 };

const ONBOARD_BUTTON =
  'group h-[clamp(2.75rem,3vw,3.25rem)] rounded-lg border border-saturn-600/35 bg-saturn-900/10 px-[clamp(1.75rem,2.2vw,2.5rem)] text-[clamp(0.95rem,1.05vw,1.15rem)] leading-none font-normal tracking-[0.01em] text-saturn-200 transition-colors hover:border-saturn-400/60 hover:bg-saturn-900/25 hover:text-saturn-50 active:bg-saturn-950';

const ONBOARD_ARROW =
  'ml-[0.5em] leading-none text-saturn-500 transition-transform duration-200 group-hover:translate-x-[0.15em] group-hover:text-saturn-400';

function Keycap({ children, active = false, className = '' }) {
  return (
    <kbd
      className={[
        'inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-b-2 px-1.5 font-mono text-[0.65rem] leading-none font-thin transition-colors',
        active
          ? 'border-(--chip-border-hover) bg-(--chip-bg-hover) text-(--chip-fg-hover)'
          : 'border-(--chip-border) bg-(--chip-bg) text-(--chip-fg)',
        className,
      ].join(' ')}
    >
      {children}
    </kbd>
  );
}

function OnboardingNavDemo({ profile }) {
  const navRef = useRef(null);
  const [pill, setPill] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    ready: false,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const displayIndex = hoveredIndex ?? activeIndex;

  const measure = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;

    const el = nav.querySelector(`[data-nav-index="${displayIndex}"]`);
    if (!el) return;

    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    setPill({
      left: elRect.left - navRect.left,
      top: elRect.top - navRect.top,
      width: elRect.width,
      height: elRect.height,
      ready: true,
    });
  }, [displayIndex]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

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

  useEffect(() => {
    const onKey = (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      let digit = null;
      if (e.code.startsWith('Digit')) {
        digit = e.code.slice(5);
      } else if (e.code.startsWith('Numpad')) {
        digit = e.code.slice(6);
      }
      if (!digit) return;

      const index = Number(digit) - 1;
      if (!NAV_ITEMS[index]) return;

      e.preventDefault();
      setActiveIndex(index);
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <GlassNavbar
      size="md"
      disableScrollTracking
      className="relative flex items-center justify-between gap-6 overflow-visible rounded-2xl px-4 select-none"
    >
      <span className="text-sm font-thin tracking-[0.2em] text-(--saturn-fg-muted) uppercase">
        Saturn
      </span>

      {profile && (
        <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-sm border border-(--nav-account-border) bg-(--nav-account-bg) py-1.5 pr-3 pl-1">
          <img
            src={`https://mc-heads.net/avatar/${profile.id}`}
            alt=""
            draggable="false"
            className="h-7 w-7 rounded-full"
          />
          <span className="text-sm font-thin tracking-wide text-(--nav-account-fg)">
            {profile.name}
          </span>
        </div>
      )}

      <nav
        ref={navRef}
        onMouseLeave={() => setHoveredIndex(null)}
        className="relative flex items-center gap-1 select-none"
      >
        {pill.ready && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute rounded-sm bg-(--nav-pill)"
            initial={false}
            animate={{
              left: pill.left,
              top: pill.top,
              width: pill.width,
              height: pill.height,
            }}
            transition={PILL_TRANSITION}
          />
        )}
        {NAV_ITEMS.map((item, index) => (
          <div key={item.to} className="relative">
            <button
              type="button"
              data-nav-index={index}
              data-tooltip={item.label}
              tabIndex={-1}
              onMouseEnter={() => setHoveredIndex(index)}
              onClick={() => setActiveIndex(index)}
              className="relative z-10 cursor-pointer rounded-sm px-3 py-2.5 text-sm font-thin tracking-wide text-(--nav-link-fg) transition-colors select-none hover:text-(--nav-link-fg-hover)"
            >
              {item.label}
            </button>
            <Keycap
              active={displayIndex === index}
              className="pointer-events-none absolute top-full left-1/2 mt-1.5 -translate-x-1/2"
            >
              {index + 1}
            </Keycap>
          </div>
        ))}
      </nav>
    </GlassNavbar>
  );
}

function Load() {
  return (
    <div className="flex h-screen items-center justify-center">
      <LineWobble
        size="100"
        stroke="5"
        bg-opacity="0.1"
        speed="2.4"
        color="#412E66"
      ></LineWobble>
    </div>
  );
}

function StageContent({ stage, username, profile, onAdvance, onComplete }) {
  switch (stage) {
    case 0:
      return <Load />;
    case 1:
      return (
        <div className="flex h-screen items-center justify-center text-[clamp(1em,5vw,8vh)]">
          <h1>Welcome to </h1>
          <TextShimmerWave
            className="[--base-color:var(--color-saturn-950)] [--base-gradient-color:var(--color-saturn-400)] dark:[--base-color:var(--color-saturn-950)] dark:[--base-gradient-color:var(--color-saturn-400)]"
            duration={0.45}
            spread={0.5}
            zDistance={0}
            scaleDistance={1}
            rotateYDistance={20}
          >
            &nbsp;Saturn Launcher
          </TextShimmerWave>
        </div>
      );
    case 2:
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <h1 className="py-[2vw] text-[clamp(1.5rem,4.5vw,5rem)] leading-[1.05] font-thin">
            Let&apos;s get started{' '}
            <span
              aria-label={`username: ${username}`}
              className="pointer-events-none mx-[0.2em] inline-flex items-center rounded-[0.15em] bg-[#2F2F34] px-[0.5em] py-[0.6rem] align-middle font-mono text-[0.5em] leading-none font-thin tracking-[-0.02em] text-[#FFFFFF] ring-1 ring-white/10 ring-inset"
            >
              {username}
            </span>
            , shall we?
          </h1>

          <Button
            variant="ghost"
            className={`${ONBOARD_BUTTON} mt-[1.25vw]`}
            onClick={() => onAdvance(3)}
          >
            Welcome
            <span aria-hidden="true" className={ONBOARD_ARROW}>
              →
            </span>
          </Button>
        </div>
      );
    case 3:
      return (
        <div className="flex h-full flex-col items-center justify-center gap-12 px-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="text-[clamp(1.5rem,4.5vw,5rem)] leading-[1.05] font-thin">
              Get around faster
            </h1>
            <p className="text-muted-foreground text-lg font-thin">
              Hold <Keycap>Alt</Keycap> and press a number key, or just click on
              them.
            </p>
          </div>

          <OnboardingNavDemo profile={profile} />

          <Button
            variant="ghost"
            className={ONBOARD_BUTTON}
            onClick={() => onAdvance(4)}
          >
            Got it
            <span aria-hidden="true" className={ONBOARD_ARROW}>
              →
            </span>
          </Button>
        </div>
      );
    case 4:
      return (
        <div className="flex h-screen flex-col items-center justify-center">
          <TextEffect
            per="word"
            as="h1"
            preset="blur"
            delay={0.5}
            className="pb-[1em] text-[clamp(1.5rem,4.5vw,5rem)] leading-[1.05] font-thin"
          >
            You're all set!
          </TextEffect>
          <Button
            variant="ghost"
            className={`${ONBOARD_BUTTON} mt-[1.25vw]`}
            onClick={onComplete}
          >
            Let's go
            <span aria-hidden="true" className={ONBOARD_ARROW}>
              →
            </span>
          </Button>
        </div>
      );
    default:
      return (
        <div className="flex h-screen flex-col items-center justify-center">
          <h1 className="py-[2em] text-[clamp(0.5rem,1.5vw,2rem)]">
            Error : Unknown Loading Stage
          </h1>
          <h1 className="pb-[2em] text-[clamp(0.5rem,1.5vw,2rem)]">
            Please restart the app
          </h1>
          <LineWobble
            size="120"
            stroke="5"
            bg-opacity="0.1"
            speed="2.4"
            color="#412E66"
          />
        </div>
      );
  }
}

function OnboardingPage() {
  const { profile } = useAuth();
  const username = profile?.name ?? 'player';
  const [stage, setStage] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (stage === 0) {
      const timer = setTimeout(() => setStage(1), 3000);
      return () => clearTimeout(timer);
    }
    if (stage === 1 && !hasOnboarded()) {
      const timer = setTimeout(() => setStage(2), 5000);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  const handleComplete = () => {
    setOnboarded();
    void navigate({ to: '/home', replace: true });
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-144 w-4xl -translate-x-1/2 rounded-full bg-(--orb-1) blur-[120px]" />
        <div className="absolute -right-32 bottom-0 h-112 w-160 rounded-full bg-(--orb-2) blur-[100px]" />
        <div className="absolute top-1/3 -left-32 h-96 w-lg rounded-full bg-(--orb-3) blur-[90px]" />
      </div>
      <AnimatePresence initial={false}>
        <motion.div
          key={stage}
          className="absolute inset-0 h-full w-full"
          initial={{ x: '100%', opacity: 0.7, filter: 'blur(6px)' }}
          animate={{ x: '0', opacity: 1, filter: 'blur(0px)' }}
          exit={{ x: '-100%', opacity: 0.7, filter: 'blur(6px)' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.38, 1] }}
        >
          <StageContent
            stage={stage}
            username={username}
            profile={profile}
            onAdvance={setStage}
            onComplete={handleComplete}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
