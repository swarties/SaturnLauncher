import { useEffect, useState } from 'react';
import './App.css';
import { Button } from '@/components/ui/button.jsx';
import { LineWobble } from 'ldrs/react';
import 'ldrs/react/LineWobble.css';
import { ShimmeringText } from '@/components/ui/shimmering-text.jsx';
import Loading from 'daisyui/components/loading/index.js';

function Load() {
  return (
    <div className="flex h-screen items-center justify-center">
      <LineWobble
        size="100"
        stroke="5"
        bg-opacity="0.1"
        speed="2.4"
        color="white"
      ></LineWobble>
    </div>
  );
}

function App() {
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
    } else if (stage === 1) {
      const Timer = setTimeout(() => {
        setStage(2);
      }, 25000);
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
      return '1';
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
        color="white"
      ></LineWobble>
    </div>
  );
}

export default App;
