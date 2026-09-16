import { createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import * as Runtime from '../../wailsjs/runtime/runtime';
import { useEffect } from 'react';

const auth = {
  isAuthenticated: false,
};

const PUBLIC_ROUTES = ['/login'];

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const isPublic = PUBLIC_ROUTES.includes(location.pathname);

    if (!auth.isAuthenticated && !isPublic) {
      throw redirect({
        to: '/login',
      });
    }

    if (auth.isAuthenticated && location.pathname === '/logi{ Window }n') {
      throw redirect({ to: '/' });
    }
  },
  component: RootLayout,
});

function RootLayout() {
  useEffect(() => {
    Runtime.WindowCenter();
  }, []);
  return <Outlet />;
}
