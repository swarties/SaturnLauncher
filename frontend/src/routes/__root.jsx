import {
  createRootRoute,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';

import { LineWobble } from 'ldrs/react';
import 'ldrs/react/LineWobble.css';
import { AlertTriangle } from 'lucide-react';

import * as Runtime from '../../wailsjs/runtime/runtime';
import { authActions, useAuth, getAuthState } from '@/stores/auth';
import { onBackendEvent, startApp } from '@/lib/backend';
import { hasOnboarded } from '@/lib/onboarding';

import { TooltipLayer } from '@/components/ui/tooltip-layer.jsx';

function getRedirectTarget(status, pathname) {
  if (status === 'unknown') return null;
  if (status === 'unauthenticated')
    return pathname === '/login' ? null : '/login';
  if (!hasOnboarded()) return pathname === '/onboarding' ? null : '/onboarding';

  if (pathname === '/login' || pathname === '/onboarding' || pathname === '/')
    return '/home';

  return null;
}

export const Route = createRootRoute({
  errorComponent: RootErrorComponent,
  beforeLoad: ({ location }) => {
    const { status } = getAuthState();
    const redirectTarget = getRedirectTarget(status, location.pathname);

    if (redirectTarget) {
      throw redirect({
        to: redirectTarget,
        replace: true,
      });
    }
  },

  component: RootLayout,
});

function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const { status } = useAuth();
  const [showStartupScreen, setShowStartupScreen] = useState(true);
  const startupStarted = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowStartupScreen(false);
    }, 1250);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'runtime' in window) {
      Runtime.WindowCenter();
    } else {
      console.error(
        'Wails runtime not found! WindowCenter() skipped due to the nature of the window.'
      );
    }

    const unsubscribeAuthSuccess = onBackendEvent(
      'auth:success',
      (profiledata) => {
        authActions.authSuccess(profiledata);
      }
    );

    const unsubscribeAuthRequired = onBackendEvent('auth:required', () => {
      authActions.authRequired();
    });

    if (!startupStarted.current) {
      startupStarted.current = true;
      void startApp();
    }

    return () => {
      unsubscribeAuthSuccess();
      unsubscribeAuthRequired();
    };
  }, []);

  useEffect(() => {
    const redirectTarget = getRedirectTarget(status, location.pathname);

    if (!redirectTarget) return;

    void navigate({
      to: redirectTarget,
      replace: true,
    });
  }, [location.pathname, navigate, status]);

  if (status === 'unknown' || showStartupScreen) return <StartupScreen />;

  // INFINITE ONBOARD LOOP !!!! VVVVVVVV

  // localStorage.removeItem('saturn.onboarded');

  return (
    <main className="min-h-screen w-full">
      <Outlet />
      <TooltipLayer />
    </main>
  );
}

function StartupScreen() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center gap-5">
      <LineWobble
        size="70"
        stroke="5"
        bg-opacity="0.1"
        speed="2.4"
        color="#412E66"
      />
      <p className="text-muted-foreground text-sm">
        Starting Saturn Launcher...
      </p>
    </main>
  );
}

function RootErrorComponent({ error, reset }) {
  return (
    <div className="bg-background relative flex h-screen w-full flex-col items-center justify-center overflow-hidden p-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-144 w-4xl -translate-x-1/2 rounded-full bg-(--orb-1) blur-[120px]" />
        <div className="absolute -right-32 bottom-0 h-112 w-160 rounded-full bg-(--orb-2) blur-[100px]" />
        <div className="absolute top-1/3 -left-32 h-96 w-lg rounded-full bg-(--orb-3) blur-[90px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full border border-(--danger-border) bg-(--danger-bg) text-(--danger-fg)">
          <AlertTriangle className="size-8" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-foreground text-3xl font-extralight tracking-tight">
            Something went wrong
          </h1>
          <p className="text-muted-foreground text-sm font-normal wrap-break-word whitespace-pre-wrap">
            {error?.message ?? 'An unexpected error occurred.'}
          </p>
        </div>

        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="text-muted-foreground h-10 rounded-md border-2 border-(--surface-border) px-5 text-sm font-thin transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover)"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 h-10 rounded-md border px-5 text-sm font-thin transition-colors"
          >
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
}
