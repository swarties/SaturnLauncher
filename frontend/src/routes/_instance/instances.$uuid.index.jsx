import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_instance/instances/$uuid/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/instances/$uuid/settings',
      params,
    });
  },
});
