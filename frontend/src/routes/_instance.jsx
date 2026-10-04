import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_instance')({
  component: InstanceWindowLayout,
});

function InstanceWindowLayout() {
  return (
    <div className="bg-background relative flex h-screen w-full overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-144 w-4xl -translate-x-1/2 rounded-full bg-(--orb-1) blur-[120px]" />
        <div className="absolute -right-32 bottom-0 h-112 w-160 rounded-full bg-(--orb-2) blur-[100px]" />
        <div className="absolute top-1/3 -left-32 h-96 w-lg rounded-full bg-(--orb-3) blur-[90px]" />
      </div>
      <div className="relative z-10 h-full w-full">
        <Outlet />
      </div>
    </div>
  );
}
