import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Heart,
  Loader2,
  X,
} from 'lucide-react';

import { fetchProject, fetchVersions, useModrinth } from '@/stores/modrinth';
import { cn, formatNumber } from '@/lib/utils';
import Loading from 'daisyui/components/loading/index.js';

const EASE = [0.22, 1, 0.38, 1];

const TABS = [
  { id: 'description', label: 'Description' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'versions', label: 'Versions' },
];

export function ProjectDetailsModal({
  project,
  uuid,
  instanceVersion,
  activeTab,
  onClose,
}) {
  const { projects } = useModrinth();
  const [tab, setTab] = useState('description');
  const entry = projects[project.project_id];

  useEffect(() => {
    void fetchProject(project.project_id);
  }, [project.project_id]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    if (tab === 'versions') {
      void fetchVersions(project.project_id, instanceVersion, activeTab);
    }
  }, [tab, project.project_id, instanceVersion, activeTab]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-(--backdrop) p-6 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.28, ease: EASE }}
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-background relative flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-md border-2 border-(--surface-border)"
      >
        <header className="flex shrink-0 items-start gap-4 border-b border-(--hairline) p-6">
          <img
            src={project.icon_url || 'https://cdn.modrinth.com/placeholder.png'}
            alt=""
            className="size-20 shrink-0 rounded-lg border border-(--hairline) bg-(--chip-bg) object-cover"
          />
          <div className="min-w-0/flex-1 flex flex-col">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 className="text-foreground text-2xl font-extralight tracking-tight">
                {project.title}
              </h2>
              <span className="text-muted-foreground text-xs font-thin">
                by {project.author}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm font-normal">
              {project.description}
            </p>
            <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-thin">
              <span className="flex items-center gap-1.5">
                <Download className="size-3.5" />
                {formatNumber(project.downloads)} downloads
              </span>
              <span className="flex items-center gap-1.5">
                <Heart className="size-3.5" />
                {formatNumber(project.follows)} followers
              </span>
              {project.display_categories?.slice(0, 3).map((c) => (
                <span
                  key={c}
                  className="rounded-sm border border-(--hairline) bg-(--chip-bg) px-2 py-0.5 text-[0.65rem] tracking-wider text-(--chip-fg) uppercase"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('versions')}
              className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 flex h-9 items-center gap-2 rounded-md border px-4 text-xs font-thin transition-colors"
            >
              <Download className="size-3.5" />
              Choose Version
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              data-tooltip="Close"
              className="text-muted-foreground flex size-9 items-center justify-center rounded-md border border-(--hairline) transition-colors hover:bg-(--surface-hover) hover:text-(--saturn-fg-hover)"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_18rem]">
          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 gap-2 border-b border-(--hairline) px-6">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'relative py-3 text-sm font-thin tracking-wide transition-colors',
                    tab === t.id
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-(--saturn-fg)'
                  )}
                >
                  {t.label}
                  {tab === t.id && (
                    <motion.div
                      layoutId="project-modal-tab-indicator"
                      className="bg-saturn-400 absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 35,
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
              {tab === 'description' && <DescriptionTab entry={entry} />}
              {tab === 'gallery' && <GalleryTab entry={entry} />}
              {tab === 'versions' && (
                <VersionsTab
                  projectId={project.project_id}
                  uuid={uuid}
                  instanceVersion={instanceVersion}
                  activeTab={activeTab}
                />
              )}
            </div>
          </div>
          <aside className="hidden min-h-0 overflow-y-auto overscroll-contain border-l border-(--hairline) p-6 md:block">
            <Sidebar project={project} entry={entry} />
          </aside>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function DescriptionTab({ entry }) {
  if (entry?.loading) return <Loading />;
  if (entry?.error) return <ErrorState message={entry.error} />;
  if (!entry?.data?.body)
    return (
      <p className="text-muted-foreground text-sm font-thin">
        No description available.
      </p>
    );

  return <div className="text-foreground text-sm">{/* TODO */}</div>;
}

function GalleryTab({ entry }) {
  if (entry?.loading) return <Loading />;
  if (entry?.error) return <ErrorState message={entry.error} />;

  const gallery = entry?.data?.gallery ?? [];
  if (gallery.length === 0) {
    return (
      <p className="text-muted-foreground text-sm font-thin">
        No gallery images.
      </p>
    );
  }

  return <div className="grid gap-4 sm:grid-cols-2">{/* TODO */}</div>;
}

function VersionsTab({ projectId, uuid, instanceVersion, activeTab }) {
  const { versions, installing } = useModrinth();
  const entry = versions[projectId];

  if (!entry || entry.loading) return <Loading />;
  if (!entry.data || entry.data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm font-thin">
        No compatible versions for Minecraft {instanceVersion}
      </p>
    );
  }

  const isInstalling = installing[projectId];

  return <div className="flex flex-col gap-2">{/* TODO */}</div>;
}

function Sidebar({ project, entry }) {
  const data = entry?.data;

  const links = [
    ...(data?.donation_urls ?? []).map((d) => ({
      label: `Donate on ${d.platform}`,
      href: d.url,
      icon: ExternalLink,
    })),
    { label: 'Report issues', href: data?.issues_url, icon: AlertTriangle },
    { label: 'View source', href: data?.source_url, icon: ExternalLink },
    { label: 'Wiki', href: data?.wiki_url, icon: ExternalLink },
    { label: 'Join Discord', href: data?.discord_url, icon: ExternalLink },
  ].filter((l) => Boolean(l.href));

  const gameVersions = data?.game_versions ?? [];
  const loaders = data?.loaders ?? [];
  const categories = data?.categories ?? project.categories ?? [];

  return <div className="flex flex-col gap-6">{/* TODO */}</div>;
}

function Loading() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center">
      <Loader2 className="text-saturn-500 size-6 animate-spin" />
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="size-6 text-(--danger-fg)" />
      <p className="text-sm font-thin text-(--danger-fg)">{message}</p>
    </div>
  );
}
