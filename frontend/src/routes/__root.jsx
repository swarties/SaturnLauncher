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

import * as Runtime from '../../wailsjs/runtime/runtime';
import { authActions, useAuth, getAuthState } from '@/stores/auth';
import { onBackendEvent, startApp } from '@/lib/backend';
import { hasOnboarded } from '@/lib/onboarding';

function getRedirectTarget(status, pathname) {
  if (status === 'unknown') return null;
  if (status === 'unauthenticated')
    return pathname === '/login' ? null : '/login';
  if (!hasOnboarded()) return pathname === '/onboarding' ? null : '/onboarding';

  if (pathname === '/login' || pathname === '/onboarding') return '/home';

  return null;
}

export const Route = createRootRoute({
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

  const { status, profile } = useAuth();
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

  //  return <Outlet />;

  return (
    <main
      key={location.pathname}
      className="min-h-screen w-full"
      style={{
        animation: 'fade-in-up 350ms cubic-bezier(0.22, 1, 0.36, 1) both',
      }}
    >
      <Outlet context={{ profile }} />
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
