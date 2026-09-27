import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { GetGameFiles } from '../../../wailsjs/go/main/App';
import { useAuth } from '@/stores/auth';

export const Route = createFileRoute('/_app/home')({
  component: HomePage,
});

function HomePage() {
  const { profile } = useAuth();
  const username = profile?.name ?? 'player';

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleDownload = async () => {
    setIsLoading(true);
    setStatus('Downloading game files...');

    try {
      await GetGameFiles();
      setStatus(
        'Client JAR and version JSON downloaded. Libraries/assets not handled yet.'
      );
    } catch (error) {
      console.error('Failed to download:', error);
      setStatus(`Error: ${error?.message ?? String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-10 px-6">
      <div className="flex flex-col items-center gap-3">
        <p className="text-muted-foreground text-xs font-thin tracking-[0.35em] uppercase">
          Welcome back,{' '}
        </p>
        <p className="text-foreground text-5xl font-extralight tracking-tight">
          {username}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="border-saturn-700/40 bg-saturn-900/20 text-saturn-200 hover:border-saturn-500/60 hover:bg-saturn-900/40 hover:text-saturn-100 h-11 rounded-lg px-6 font-thin"
          onClick={handleDownload}
          disabled={isLoading}
        >
          {isLoading ? 'Downloading...' : 'Download Game Files'}
        </Button>

        <Button
          variant="outline"
          className="group border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 h-11 gap-2 rounded-lg border px-6 font-thin transition-colors"
        >
          Launch Minecraft
          <span
            aria-hidden="true"
            className="text-saturn-300 transition-transform duration-200 group-hover:translate-x-1"
          >
            →
          </span>
        </Button>
      </div>
      {status && (
        <p className="text-muted-foreground max-w-md text-center text-sm">
          {status}
        </p>
      )}
    </div>
  );
}
