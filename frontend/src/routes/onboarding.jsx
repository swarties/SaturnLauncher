import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.jsx';
import { LineWobble } from 'ldrs/react';
import 'ldrs/react/LineWobble.css';
import * as root from '@/routes/__root.jsx';

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
  useEffect(() => {
    if (stage === 0) {
      const Timer = setTimeout(() => {
        setStage(1);
      }, 7500); // temp big but set to 3k in prod
      return () => clearTimeout(Timer);
    } else if (stage === 1 && !root.onboarding.hasOnboarded) {
      const Timer = setTimeout(() => {
        setStage(2);
      }, 5000);
      return () => clearTimeout(Timer);
    }
  }, [stage]);

  switch (stage) {
    case 0:
      return <Load />;
    case 1:
      return (
        <div className="flex h-screen items-center justify-center">
          <h1>Welcome to </h1>
          <h2>&nbsp;Saturn Launcher</h2>
        </div>
      );
    case 2:
      return (
        <div className="flex h-screen flex-col items-center justify-center">
          <h1 className="py-[2vw] text-[clamp(1.5rem,4.5vw,5rem)]">
            Let's get started, shall we?
          </h1>
          <Button className="bg-[#412E66] text-[clamp(1rem,2vw,3rem)] font-semibold hover:bg-[#2e2046]">
            Welcome →
          </Button>
        </div>
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
