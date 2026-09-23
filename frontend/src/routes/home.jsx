import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.jsx';

export const Route = createFileRoute('/home')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center">
      <h1>HI</h1>
      <h2>Helllo</h2>
      <Button>Boom</Button>
      <Button>Launch Minecraft</Button>
    </div>
  );
}

// WIP divs in divs for flex layout or the other thing
