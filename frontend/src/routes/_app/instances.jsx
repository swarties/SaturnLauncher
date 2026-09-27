import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/instances')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_app/instances"!</div>;
}
