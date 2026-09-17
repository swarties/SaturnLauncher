import { createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import * as Runtime from '../../wailsjs/runtime/runtime';
import { useEffect } from 'react';

const auth = {
  isAuthenticated: false,
};
export const onboarding = {
  hasOnboarded: false,
};

const PUBLIC_ROUTES = ['/login', '/onboarding'];

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const isPublic = PUBLIC_ROUTES.includes(location.pathname);

    if (auth.isAuthenticated) {
      if (onboarding.hasOnboarded) {
        if (isPublic && location.pathname !== '/home') {
          throw redirect({
            to: '/home',
          });
        }
      } else if (
        !onboarding.hasOnboarded &&
        location.pathname !== '/onboarding'
      ) {
        throw redirect({
          to: '/onboarding',
        });
      }
    } else if (!auth.isAuthenticated && location.pathname !== '/login') {
      throw redirect({
        to: '/login',
      });
    }
  },
  component: RootLayout,
});

function RootLayout() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'runtime' in window) {
      Runtime.WindowCenter();
    } else {
      console.error(
        'Wails runtime not found! WindowCenter() skipped due to the nature of the window.'
      );
    }
  }, []);
  return <Outlet />;
}
