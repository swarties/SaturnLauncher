import { createFileRoute } from '@tanstack/react-router';
import { ContentList } from '@/components/ui/content-list.jsx';

export const Route = createFileRoute(
  '/_instance/instances/$uuid/resourcepacks'
)({
  component: ResourcePacksTab,
});

function ResourcePacksTab() {
  const { uuid } = Route.useParams();
  return <ContentList uuid={uuid} contentType="resourcepacks" />;
}
