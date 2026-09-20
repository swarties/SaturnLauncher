import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
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
  const [stage, setStage] = useState(0);
  // loadingInitial = 0
  // welcome = 1
  // onboarding = 2 // ...
  // homePage = 3

  const { profile } = useAuth();

  console.log('Saturn onboarding profile:', profile);

  const username = profile?.name ?? 'player';

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

  switch (stage) {
    case 0:
      return (
        <Fade
          key="onboarding-stage-0"
          duration={420}
          up={50}
          className="h-screen w-full"
        >
          <Load />
        </Fade>
      );
    case 1:
      return (
        <Fade
          key="onboarding-stage-1"
          duration={420}
          up={50}
          className="h-screen w-full"
        >
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
        </Fade>
      );
    case 2:
      return (
        <Fade>
          <div>
            <h1>
              Let&apos;s get started&nbsp;<span>{username}</span>, shall we?
            </h1>
            <Button>Welcome →</Button>
          </div>
        </Fade>
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
        <div id="App" className={`flex h-screen items-center justify-center`}>
          <h1>
            Hi, Hello to my super cool app Saturn Launcher. Nice to meet you!
          </h1>
        </div>
      );
  }

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
