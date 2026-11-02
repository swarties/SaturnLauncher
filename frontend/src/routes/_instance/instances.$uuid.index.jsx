import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_instance/instances/$uuid/')({
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/instances/$uuid/logs',
      params,
      search,
    });
  },
});
