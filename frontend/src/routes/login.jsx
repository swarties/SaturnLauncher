import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.jsx';
import microsoftLight from '../assets/images/microsoft-light.svg';
import microsoftDark from '../assets/images/microsoft-dark.svg';
import { useEffect, useState } from 'react';
import { authActions, useAuth } from '@/stores/auth';
import { onBackendEvent, openExternalURL, startLogin } from '@/lib/backend';

export const Route = createFileRoute('/login')({
  component: RouteComponent,
});

function RouteComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { error, userCode, verificationUri } = useAuth();

  useEffect(() => {
    const stopListeningForCode = onBackendEvent(
      'login:send_received',
      (payload) => {
        authActions.loginCode(payload);

        const verificationUri =
          payload?.verificationUri ?? payload?.verification_uri;

        if (verificationUri) {
          openExternalURL(verificationUri);
        }
      }
    );

    const stopListeningForSuccess = onBackendEvent(
      'login:success',
      (profile) => {
        setIsLoading(false);
        authActions.loginSuccess(profile);
      }
    );

    const stopListeningForError = onBackendEvent('login:error', (message) => {
      setIsLoading(false);
      authActions.loginError(message);
    });

    return () => {
      stopListeningForCode();
      stopListeningForSuccess();
      stopListeningForError();
    };
  }, []);

  const authFlow = async () => {
    if (isLoading) return;

    setIsLoading(true);
    authActions.clearError();

    void startLogin();
  };

  const copyCode = async () => {
    if (!userCode) return;

    try {
      await navigator.clipboard.writeText(userCode);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      authActions.loginError(
        'Could not copy the code automatically. Please select it and copy it manually'
      );
    }
  };

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-5 px-6">
        <h1 className="text-2xl font-thin">Sign-in failed</h1>
        <p className="max-w-md text-center text-sm text-red-400">{error}</p>
        <Button
          onClick={authFlow}
          className="bg-[#412E66] font-thin hover:bg-[#2e2046]"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (userCode) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-5 px-6">
        <p className="text-muted-foreground max-w-md text-center text-sm">
          Sign in to Microsft in your browser, then enter this code:
        </p>
        <code className="bg-muted rounded-lg border px-6 py-4 font-mono text-3xl tracking-[0.2em]">
          {userCode}
        </code>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={copyCode}>
            {copied ? 'Copied!' : 'Copy code'}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              openExternalURL(verificationUri);
            }}
          >
            Open Microsoft
          </Button>
        </div>

        <p className="text-muted-foreground text-center text-sm">
          Waiting for you to finish sign-in...
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col items-center justify-center">
      <div className="scale-175">
        <Button
          variant="outline"
          className="group flex items-center gap-[0.4em] rounded-lg border bg-black px-[0.9em] py-[0.5em] text-[clamp(1rem,2vw,2rem)] font-bold tracking-wide text-white transition-all hover:translate-0 hover:scale-105 hover:bg-white hover:text-black"
          onClick={authFlow}
          disabled={isLoading}
        >
          <span className="leading-none font-thin">
            {isLoading ? 'OPENING...' : 'LOGIN'}
          </span>
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

    // Add a small gray text with Other Logins? that open a pop-up saying only microsoft logins are supported
  );
}
