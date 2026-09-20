import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/button.jsx';
import { LineWobble } from 'ldrs/react';
import 'ldrs/react/LineWobble.css';
import { hasOnboarded, setOnboarded } from '@/lib/onboarding';
import { useAuth } from '@/stores/auth';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave.jsx';

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
            <h1 className="py-[2vw] text-[clamp(1.5rem,4.5vw,5rem)] leading-none font-thin">
              Let&apos;s get started&nbsp;
              <span className="pointer-events-none mx-[0.1em] inline-flex translate-y-[0.06em] items-center rounded-xl border border-[#8456D5]/70 bg-[#2E2046] px-[0.38em] py-[0.16em] align-[0.14em] font-mono text-[0.5em] leading-none font-thin tracking-[-0.04em] text-[#e5e3fc]">
                {username}
              </span>
              , shall we?
            </h1>
            <Button
              className="h-[clamp(3.25rem,3.7vw,4.25rem)] min-w-[clamp(9rem,10vw,11rem)] rounded-xl px-[clamp(1.25rem,1.6vw,1.9rem)] text-[clamp(1rem,1.2vw,1.35rem)] leading-none font-medium text-[#F1F0FD] shadow-[0_8px_22px_rgba(46,32,70,0.26)] transition-colors hover:bg-[#5D3C97] active:bg-[#412E66]"
              onClick={onComplete}
            >
              Welcome{' '}
              <span
                aria-hidden="true"
                className="ml-[0.45em] text-[1.15em] leading-none"
              >
                →
              </span>
            </Button>
          </div>
          // <div className="flex h-screen flex-col items-center justify-center">
          //   <h1 className="py-[2vw] text-[clamp(1.5rem,4.5vw,5rem)] font-thin">
          //     Let's get started, shall we?
          //   </h1>
          //   <Button className="bg-[#412E66] text-[clamp(1rem,2vw,3rem)] font-thin hover:bg-[#2e2046]">
          //     Welcome →
          //   </Button>
          // </div>
        );
      case 3:
        return (
          <div
            id="App"
            className={`flex h-screen flex-col items-center justify-center`}
          >
            <h1>
              Hi, Hello to my super cool app Saturn Launcher. Nice to meet you!
            </h1>
          </div>
        );
      default:
        return (
          <div className="flex h-screen flex-col items-center justify-center">
            <h1 className="py-[2em]">Error : Unknown Loading Stage</h1>
            <LineWobble
              size="100"
              stroke="5"
              bg-opacity="0.1"
              speed="2.4"
              color="#412E66"
            />
          </div>
        );
    }
  }

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
              setStage(3);
            }}
          ></StageContent>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
