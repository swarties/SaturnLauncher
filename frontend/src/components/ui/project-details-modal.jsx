import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Heart,
  Loader2,
  X,
} from 'lucide-react';

import {
  fetchProject,
  fetchVersions,
  installMod,
  useModrinth,
} from '@/stores/modrinth';
import { cn, formatNumber, timeAgo } from '@/lib/utils';
import { openExternalURL } from '@/lib/backend.js';

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
  initialTab = 'description',
  onClose,
}) {
  const { projects } = useModrinth();
  const [tab, setTab] = useState(initialTab);
  const [hoveredIndex, setHoveredIndex] = useState(null);
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

  const activeIndex = TABS.findIndex((t) => t.id === tab);
  const targetIndex = hoveredIndex ?? activeIndex;

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
          <div className="flex min-w-0 flex-1 flex-col">
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
                  className="rounded-sm border border-(--hairline) bg-(--chip-bg) px-2 py-0.5 text-[0.7rem] font-normal tracking-wider text-(--chip-fg) uppercase"
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
              data-tooltip="View all versions"
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
            <div
              onMouseLeave={() => setHoveredIndex(null)}
              className="flex shrink-0 items-center gap-1 border-b border-(--hairline) px-6 py-3"
            >
              {TABS.map((t, index) => {
                const isActive = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'relative rounded-md px-4 py-1.5 text-sm font-normal tracking-wide transition-colors',
                      isActive
                        ? 'text-(--chip-fg-hover)'
                        : 'text-muted-foreground'
                    )}
                  >
                    {targetIndex === index && (
                      <motion.div
                        layoutId="project-modal-tab-bg"
                        className="absolute inset-0 rounded-md border border-(--chip-border-hover) bg-(--chip-bg-hover)"
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 35,
                        }}
                      />
                    )}
                    <span className="relative z-10">{t.label}</span>
                  </button>
                );
              })}
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

  return (
    <div className="text-foreground text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="text-foreground mt-6 mb-3 text-2xl font-extralight tracking-tight first:mt-0"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="text-foreground mt-5 mb-2 text-xl font-extralight tracking-tight first:mt-0"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-foreground mt-4 mb-2 text-lg font-light"
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p
              className="text-muted-foreground mb-3 leading-relaxed"
              {...props}
            />
          ),
          a: ({ node, href, children, ...props }) => (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (href) openExternalURL(href);
              }}
              {...props}
              className="text-saturn-400 hover:text-saturn-300 underline underline-offset-4 transition-colors"
            >
              {children}
            </button>
          ),
          img: ({ node, alt, ...props }) => (
            <img
              className="my-3 max-w-full rounded-md border border-(--hairline)"
              {...props}
              alt={alt ?? ''}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul className="mb-3 list-inside list-disc space-y-1" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="mb-3 list-inside list-decimal space-y-1"
              {...props}
            />
          ),
          li: ({ node, ...props }) => (
            <li className="text-muted-foreground" {...props} />
          ),
          pre: ({ node, children, ...props }) => (
            <pre
              className="my-3 overflow-x-auto rounded-md border border-(--code-border) bg-(--code-bg) p-3 font-mono text-xs text-(--code-fg)"
              {...props}
            >
              {children}
            </pre>
          ),
          code: ({ node, className, children, ...props }) => {
            const isBlock =
              typeof className === 'string' &&
              className.startsWith('language-');
            if (isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded border border-(--code-border) bg-(--code-bg) px-1.5 py-0.5 font-mono text-xs text-(--code-fg)"
                {...props}
              >
                {children}
              </code>
            );
          },
          hr: () => <hr className="my-4 border-(--hairline)" />,
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="text-muted-foreground my-3 border-l-2 border-(--surface-border) pl-4 italic"
              {...props}
            />
          ),
          table: ({ node, ...props }) => (
            <table className="my-3 w-full border-collapse text-xs" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th
              className="border border-(--hairline) px-2 py-1 text-left font-normal"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-(--hairline) px-2 py-1" {...props} />
          ),
        }}
      >
        {entry.data.body}
      </ReactMarkdown>
    </div>
  );
}

function GalleryTab({ entry }) {
  if (entry?.loading) return <Loading />;
  if (entry?.error) return <ErrorState message={entry.error} />;

  const gallery = entry?.data?.gallery ?? [];
  if (gallery.length === 0) {
    return (
      <div className="flex h-full min-h-40 items-center justify-center">
        <p className="text-muted-foreground text-center text-sm font-thin">
          No gallery images.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {gallery.map((img, i) => (
        <figure
          key={`g${i}`}
          className="bg-background flex flex-col gap-2 overflow-hidden rounded-md border border-(--hairline)"
        >
          <div className="flex aspect-video w-full items-center justify-center overflow-hidden bg-(--surface-active)/50">
            <img
              src={img.url}
              alt={img.title ?? ''}
              loading="lazy"
              className="h-full w-full object-contain"
            />
          </div>
          {img.title && (
            <figcaption className="text-muted-foreground px-3 pb-3 text-xs font-thin">
              {img.title}
              {img.description && (
                <span className="ml-2 opacity-70">- {img.description}</span>
              )}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
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
  const sortedVersions = [...entry.data].sort(
    (a, b) => new Date(b.date_published) - new Date(a.date_published)
  );
  const latestReleaseId = sortedVersions.find(
    (v) => v.version_type === 'release'
  )?.id;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs font-normal tracking-wider uppercase">
        Compatible Versions :
      </p>
      <div className="flex flex-col gap-2">
        {sortedVersions.map((ver) => {
          const isLatest = ver.id === latestReleaseId;
          return (
            <div
              key={ver.id}
              className={[
                'flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-(--surface-hover)',
                isLatest ? 'border-saturn-500/50' : 'border-(--hairline)',
              ].join(' ')}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2">
                  <p className="text-foreground truncate text-sm font-normal">
                    {ver.name}
                  </p>
                  {isLatest && (
                    <span className="border-saturn-500/50 bg-saturn-700/30 text-saturn-100 shrink-0 rounded-sm border px-1.5 py-0.5 text-[0.6rem] font-normal tracking-wider uppercase">
                      Latest
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs font-thin">
                  {ver.version_number} • {timeAgo(ver.date_published)}
                  {ver.version_type && (
                    <span className="ml-2 capitalize">
                      - {ver.version_type}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  void installMod(uuid, projectId, ver.id, ver.name, activeTab)
                }
                disabled={isInstalling}
                data-tooltip={`Install ${ver.version_number}`}
                className={[
                  'flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-normal transition-colors disabled:pointer-events-none disabled:opacity-50',
                  isLatest
                    ? 'border-saturn-500/60 bg-saturn-700/40 text-saturn-100 hover:border-saturn-400/70 hover:bg-saturn-700/60 hover:text-saturn-50'
                    : 'border-(--surface-border) text-(--saturn-fg-muted) hover:border-(--chip-border-hover) hover:bg-(--chip-bg-hover) hover:text-(--chip-fg-hover)',
                ].join(' ')}
              >
                {isInstalling ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                {isLatest ? 'Install Latest' : 'Install'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
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

  const isSnapshot = (v) => /snapshot|^\d{2}w\d{2}[a-z]?$/i.test(v);
  const gameVersions = (data?.game_versions ?? [])
    .filter((v) => !isSnapshot(v))
    .sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' })
    );
  const loaders = data?.loaders ?? [];
  const categories = data?.categories ?? project.categories ?? [];

  return (
    <div className="flex flex-col gap-6">
      {gameVersions.length > 0 && (
        <section>
          <h3 className="text-muted-foreground mb-3 text-xs font-thin tracking-[0.2em] uppercase">
            Compatibility
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {gameVersions.slice(0, 12).map((v) => (
              <span
                key={v}
                className="rounded-sm border border-(--hairline) bg-(--chip-bg) px-2 py-0.5 text-xs font-normal text-(--chip-fg)"
              >
                {v}
              </span>
            ))}
          </div>
        </section>
      )}

      {loaders.length > 0 && (
        <section>
          <h3 className="text-muted-foreground mb-3 text-xs font-thin tracking-[0.2em] uppercase">
            Platforms
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {loaders.map((l) => (
              <span
                key={l}
                className="rounded-sm border border-(--hairline) bg-(--chip-bg) px-2 py-0.5 text-xs font-normal text-(--chip-fg) capitalize"
              >
                {l}
              </span>
            ))}
          </div>
        </section>
      )}

      {links.length > 0 && (
        <section>
          <h3 className="text-muted-foreground mb-3 text-xs font-thin tracking-[0.2em] uppercase">
            Links
          </h3>
          <div className="flex flex-col gap-1">
            {links.map((l) => {
              const Icon = l.icon;
              return (
                <button
                  key={l.label}
                  type="button"
                  onClick={() => openExternalURL(l.href)}
                  className="text-muted-foreground flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs font-thin transition-colors hover:bg-(--surface-hover) hover:text-(--saturn-fg-hover)"
                >
                  <Icon className="size-3.5 shrink-0" />
                  {l.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section>
          <h3 className="text-muted-foreground mb-3 text-xs font-thin tracking-[0.2em] uppercase">
            Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <span
                key={cat}
                className="rounded-sm border border-(--hairline) bg-(--chip-bg) px-2 py-0.5 text-xs font-normal text-(--chip-fg) capitalize"
              >
                {cat}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
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
