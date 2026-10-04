import { ComingSoon } from '@/components/ui/coming-soon.jsx';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_instance/instances/$uuid/screenshots')({
  component: () => <ComingSoon label="Screenshots" />,
});
