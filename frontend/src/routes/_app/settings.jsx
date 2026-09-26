import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6">
      <h1 className="text-3xl font-thin tracking-wide">Settings</h1>
      <p className="text-muted-foreground text-sm">Coming soon.</p>
    </div>
  );
}
