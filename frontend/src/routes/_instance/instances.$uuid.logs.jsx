import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/ui/coming-soon.jsx';

export const Route = createFileRoute('/_instance/instances/$uuid/logs')({
  component: () => <ComingSoon label="Logs" />,
});
