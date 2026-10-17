import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { THEMES, useTheme, setTheme } from '@/stores/theme';
import { useLaunch } from '@/stores/launch';

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { id: activeId } = useTheme();
  const navigate = useNavigate();
  const { instances } = useLaunch();

  const isAnyInstanceActive = Object.values(instances).some(
    (inst) => inst.phase === 'launching' || inst.phase === 'running'
  );

  const handleRedoOnboarding = () => {
    if (isAnyInstanceActive) return;
    localStorage.removeItem('saturn.onboarded');
    void navigate({ to: '/onboarding', replace: true });
  };

  return (
    <div className="flex h-full w-full flex-col p-6">
      <div className="mb-8">
        <h1 className="text-foreground text-3xl font-normal tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm font-thin">
          Personalize your launcher.
        </p>
      </div>

      <section className="max-w-3xl">
        <p className="text-muted-foreground text-sm font-thin tracking-[0.2em] uppercase">
          Theme
        </p>
        <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3">
          {THEMES.map((theme) => (
            <ThemeTitle
              key={theme.id}
              theme={theme}
              selected={theme.id === activeId}
              onSelect={() => setTheme(theme.id)}
            />
          ))}
        </div>
      </section>
      <section className="mt-10 max-w-3xl">
        <p className="text-muted-foreground tracking- text-sm font-thin uppercase">
          Advanced - <span className="text-red-300">Danger Zone</span>
        </p>
        <div className="mt-4 flex items-center justify-between rounded-md border border-(--hairline) p-4">
          <div>
            <p className="text-foreground text-sm font-normal">
              Redo Onboarding
            </p>
            <p className="text-muted-foreground text-xs font-thin">
              {isAnyInstanceActive
                ? 'Cannot restart while a game is running or launching.'
                : 'Replay the initial welcome and setup screens.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRedoOnboarding}
            disabled={isAnyInstanceActive}
            className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 h-10 shrink-0 rounded-md border px-5 text-sm font-thin transition-colors disabled:pointer-events-none disabled:opacity-40"
          >
            Restart
          </button>
        </div>
      </section>
    </div>
  );
}

/**
 * @param {{ theme: import('@/stores/theme').Theme, selected: boolean, onSelect: () => void }} props
 */

function ThemeTitle({ theme, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        'group flex flex-col gap-3 rounded-md border-2 p-3 text-left transition-colors',
        selected
          ? 'border-(--surface-border-hover) bg-(--surface-hover)'
          : 'border-(--surface-border) hover:border-(--surface-border-hover) hover:bg-(--surface-hover)',
      ].join(' ')}
    >
      {/* Live preview */}
      <div
        className={`${theme.className} overflow-hidden rounded-sm border border-(--surface-border)`}
      >
        <div className="bg-background p-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 shrink-0 rounded-full bg-(--nav-account-bg)" />
            <div className="min-w-0 flex-1">
              <div className="bg-foreground/80 h-1.5 w-16 rounded-full" />
              <div className="bg-muted-foreground/60 mt-1.5 h-1 w-10 rounded-full" />
            </div>
          </div>
          <div className="mt-3 flex gap-1.5">
            <div className="h-4 flex-1 rounded-sm bg-(--chip-bg)" />
            <div className="bg-saturn-900 h-4 w-6 rounded-sm" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-foreground truncate text-sm font-normal">
            {theme.label}
          </p>
          {theme.description && (
            <p className="text-muted-foreground truncate text-xs font-thin">
              {theme.description}
            </p>
          )}
        </div>
        {selected && (
          <span aria-hidden="true" className="text-saturn-400 shrink-0 text-xs">
            ●
          </span>
        )}
      </div>
    </button>
  );
}
