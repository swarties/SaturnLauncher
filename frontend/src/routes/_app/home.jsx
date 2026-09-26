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
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 px-6">
      <h1 className="text-3xl font-thin tracking-wide">
        Welcome back, {username}
      </h1>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="border-saturn-700/40 bg-saturn-900/20 text-saturn-200 hover:border-saturn-500/60 hover:bg-saturn-900/40 hover:text-saturn-100"
          onClick={handleDownload}
          disabled={isLoading}
        >
          {isLoading ? 'Downloading...' : 'Download Game Files'}
        </Button>

        <Button
          variant="outline"
          className="border-saturn-700/40 bg-saturn-900/20 text-saturn-200 hover:border-saturn-500/60 hover:bg-saturn-900/40 hover:text-saturn-100"
        >
          Launch Minecraft
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
