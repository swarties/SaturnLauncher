import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.jsx';
import { useState } from 'react';
import { GetGameFiles } from '../../wailsjs/go/main/App';

export const Route = createFileRoute('/home')({
  component: RouteComponent,
});

function RouteComponent() {
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
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <h1>HI</h1>
      <h2>Helllo</h2>
      <Button onClick={handleDownload} disabled={isLoading}>
        {isLoading ? 'Downloading...' : 'Boom'}
      </Button>
      <Button>Launch Minecraft</Button>
      {status && <p>{status}</p>}
    </div>
  );
}

// WIP divs in divs for flex layout or the other thing
