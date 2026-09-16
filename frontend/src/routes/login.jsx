import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.jsx';
import microsoftLight from '../assets/images/microsoft-light.svg';
import microsoftDark from '../assets/images/microsoft-dark.svg';

export const Route = createFileRoute('/login')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Button
        variant="outline"
        className="group flex items-center gap-[0.4em] rounded-lg border bg-black px-[0.9em] py-[0.5em] text-[clamp(1rem,2vw,2rem)] font-bold tracking-wide text-white transition-colors hover:bg-white hover:text-black"
      >
        <span className="leading-none">LOGIN</span>
        <img
          className="block h-[clamp(1.25rem,1em,2rem)] w-auto group-hover:hidden"
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
  );
}
