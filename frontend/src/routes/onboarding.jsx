import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/button.jsx';
import { LineWobble } from 'ldrs/react';
import 'ldrs/react/LineWobble.css';
import { hasOnboarded, setOnboarded } from '@/lib/onboarding';
import { useAuth } from '@/stores/auth';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave.jsx';
import { TextEffect } from '@/components/ui/text-effect.jsx';

export const Route = createFileRoute('/onboarding')({
  component: RouteComponent,
});

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

function RouteComponent() {
  const { profile } = useAuth();
  const username = profile?.name ?? 'player';
  const [stage, setStage] = useState(0);
  // loadingInitial = 0
  // welcome = 1
  // onboarding = 2 // ...
  // homePage = 3

  useEffect(() => {
    if (stage === 0) {
      const Timer = setTimeout(() => {
        setStage(1);
      }, 3000); // temp big but set to 3k in prod
      return () => clearTimeout(Timer);
    } else if (stage === 1 && !hasOnboarded()) {
      const Timer = setTimeout(() => {
        setStage(2);
      }, 5000);
      return () => clearTimeout(Timer);
    }
  }, [stage]);

  function StageContent({ stage, username, onComplete }) {
    switch (stage) {
      case 0:
        return <Load />;
      case 1:
        return (
          <div className="flex h-screen items-center justify-center text-[clamp(1em,5vw,8vh)]">
            <h1>Welcome to </h1>
            <TextShimmerWave
              className="[--base-color:#412e66] [--base-gradient-color:#a18dec]"
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
              className="group mt-[1.25vw] h-[clamp(2.75rem,3vw,3.25rem)] rounded-lg border border-[#8456D5]/35 bg-[#412E66]/10 px-[clamp(1.75rem,2.2vw,2.5rem)] text-[clamp(0.95rem,1.05vw,1.15rem)] leading-none font-normal tracking-[0.01em] text-[#D1CDF8] transition-colors hover:border-[#A18DEC]/60 hover:bg-[#412E66]/25 hover:text-[#F1F0FD] active:bg-[#2E2046]"
              onClick={() => setStage(3)}
            >
              Welcome
              <span
                aria-hidden="true"
                className="ml-[0.5em] leading-none text-[#9171E3] transition-transform duration-200 group-hover:translate-x-[0.15em] group-hover:text-[#A18DEC]"
              >
                →
              </span>
            </Button>
          </div>
        );
      case 3:
        return (
          <div
            id="App"
            className={`flex h-screen flex-col items-center justify-center`}
          >
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
              className="group mt-[1.25vw] h-[clamp(2.75rem,3vw,3.25rem)] rounded-lg border border-[#8456D5]/35 bg-[#412E66]/10 px-[clamp(1.75rem,2.2vw,2.5rem)] text-[clamp(0.95rem,1.05vw,1.15rem)] leading-none font-normal tracking-[0.01em] text-[#D1CDF8] transition-colors hover:border-[#A18DEC]/60 hover:bg-[#412E66]/25 hover:text-[#F1F0FD] active:bg-[#2E2046]"
              onClick={onComplete}
            >
              Let's go
              <span
                aria-hidden="true"
                className="ml-[0.5em] leading-none text-[#9171E3] transition-transform duration-200 group-hover:translate-x-[0.15em] group-hover:text-[#A18DEC]"
              >
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

  const navigate = useNavigate();

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.div
          key={stage}
          className="absolute inset-0 h-full w-full"
          initial={{ x: '100%', opacity: 0.7, filter: 'blur(6px)' }} // filter: 'blur(6px)'
          animate={{ x: '0', opacity: 1, filter: 'blur(0px)' }} // filter: 'blur(0px)'
          exit={{ x: '-100%', opacity: 0.7, filter: 'blur(6px)' }} // filter: 'blur(6px)'
          transition={{ duration: 0.55, ease: [0.22, 1, 0.38, 1] }}
        >
          <StageContent
            stage={stage}
            username={username}
            onComplete={() => {
              setOnboarded();
              void navigate({
                to: '/home',
                replace: true,
              });
            }}
          ></StageContent>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
