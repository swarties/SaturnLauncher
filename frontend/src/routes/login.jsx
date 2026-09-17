import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.jsx';
import microsoftLight from '../assets/images/microsoft-light.svg';
import microsoftDark from '../assets/images/microsoft-dark.svg';
import { useState } from 'react';

export const Route = createFileRoute('/login')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const authFlow = async () => {
    setIsLoading(true);
  };

  return (
    <div className="relative flex h-screen flex-col items-center justify-center">
      <div className="scale-175">
        <Button
          variant="outline"
          className="group flex items-center gap-[0.4em] rounded-lg border bg-black px-[0.9em] py-[0.5em] text-[clamp(1rem,2vw,2rem)] font-bold tracking-wide text-white transition-all hover:translate-0 hover:scale-105 hover:bg-white hover:text-black"
          onClick={authFlow()}
        >
          <span className="leading-none font-thin">LOGIN</span>
          <img
            className="block h-[1em] w-auto group-hover:hidden"
            src={microsoftLight}
            alt="microsoft icon"
          />
          <img
            className="hidden h-[clamp(1.25rem,1em,2rem)] w-auto group-hover:block"
            src={microsoftDark}
            alt="microsoft icon"
          />
        </Button>
      </div>

      <span className="absolute bottom-6 left-1/2 -translate-x-1/2 font-thin">
        Saturn Launcher
      </span>
    </div>

    // Add a small gray text with Other Logins? that open a pop up saying only microsoft logins are supported
  );
}
