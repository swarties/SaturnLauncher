import { useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  Download,
  Heart,
  Loader2,
  Search,
} from 'lucide-react';
import { useInstance } from '@/stores/instance';
import {
  fetchDiscovery,
  fetchVersions,
  installMod,
  setSortBy,
  useModrinth,
} from '@/stores/modrinth';
import { formatNumber, timeAgo } from '@/lib/utils';

export const Route = createFileRoute('/_instance/instances/$uuid/modrinth')({
  component: ModrinthBrowser,
});

const TABS = [
  { id: 'mod', label: 'Mods' },
  { id: 'resourcepack', label: 'Resource Packs' },
  { id: 'shader', label: 'Shaders' },
];

function ModrinthBrowser() {
  const { uuid } = Route.useParams();
  const navigate = useNavigate();
  const { data: instance } = useInstance();
  const { results, loading, error, sortBy } = useModrinth();

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('mod');
  const [openMenuId, setOpenMenuId] = useState(null);
  const searchRef = useRef(null);

  const handleScroll = () => {
    if (openMenuId) setOpenMenuId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.isContentEditable)
      )
        return;

      if (e.key.length === 1) {
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const sortedResults = useMemo(() => {
    if (sortBy === 'downloads') {
      return [...results].sort((a, b) => b.downloads - a.downloads);
    }
    if (sortBy === 'updated') {
      return [...results].sort(
        (a, b) => new Date(b.date_modified) - new Date(a.date_modified)
      );
    }
    return results;
  }, [results, sortBy]);

  useEffect(() => {
    if (!instance?.version) return;

    const timer = setTimeout(() => {
      void fetchDiscovery(uuid, instance.version, query, activeTab);
    }, 300);

    return () => clearTimeout(timer);
  }, [instance?.version, activeTab, query]);

  const handleSearch = (e) => {
    setQuery(e.target.value);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  if (!instance) return null;

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate({ to: '/instances/$uuid', params: { uuid } })}
          className="flex size-10 items-center justify-center rounded-md border border-(--hairline) text-(--saturn-fg-muted) transition-colors hover:bg-(--surface-hover)"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search Modrinth..."
            value={query}
            onChange={handleSearch}
            className="bg-background h-10 w-full rounded-md border border-(--hairline) pr-4 pl-9 text-sm outline-none focus:border-(--chip-border-hover)"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-background h-10 rounded-md border border-(--hairline) px-3 text-sm text-(--saturn-fg) outline-none focus:border-(--chip-border-hover)"
        >
          <option value="relevance">Relevance</option>
          <option value="downloads">Downloads</option>
          <option value="updated">Updated</option>
        </select>
      </div>
      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-(--hairline) pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`rounded-md px-4 py-1.5 text-sm font-thin transition-colors ${
              activeTab === tab.id
                ? 'bg-(--chip-bg-hover) text-(--chip-fg-hover)'
                : 'text-(--saturn-fg-muted) hover:bg-(--surface-hover)'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div
        onScroll={handleScroll}
        className="min-h-0 flex-1 scrollbar-gutter-stable overflow-y-auto"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-8 animate-spin text-(--saturn-500)" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-(--danger-fg)">
            <AlertCircle className="size-8" />
            <p className="font-thin">{error}</p>
            <button
              onClick={() =>
                fetchDiscovery(uuid, instance.version, query, activeTab)
              }
              className="rounded-md border border-(--danger-border) bg-(--danger-bg) px-4 py-2 text-sm font-thin transition-colors hover:bg-(--danger-bg-hover)"
            >
              Retry
            </button>
          </div>
        ) : sortedResults.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center font-thin">
            No results found.
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-8">
            <AnimatePresence>
              {sortedResults.map((project, i) => (
                <ProjectRow
                  key={project.project_id}
                  project={project}
                  index={i}
                  uuid={uuid}
                  instanceVersion={instance.version}
                  activeTab={activeTab}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  index,
  uuid,
  instanceVersion,
  activeTab,
  openMenuId,
  setOpenMenuId,
}) {
  const { installing, installed, versions } = useModrinth();

  const isInstalled = installed[project.project_id];
  const isInstalling = installing[project.project_id];
  const versionData = versions[project.project_id];
  const menuOpen = openMenuId === project.project_id;

  const handleDownloadClick = () => {
    if (isInstalled || isInstalling) return;

    if (!versionData?.data) {
      void fetchVersions(project.project_id, instanceVersion, activeTab);
    }
    setOpenMenuId(menuOpen ? null : project.project_id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group bg-background relative flex items-center gap-4 rounded-md border border-(--hairline) p-4 transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover)"
    >
      <img
        src={project.icon_url || 'https://cdn.modrinth.com/placeholder.png'}
        alt=""
        className="size-16 shrink-0 rounded-md bg-(--chip-bg) object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline gap-2">
          <h3 className="text-foreground truncate font-medium">
            {project.title}
          </h3>
          <span className="text-muted-foreground text-xs font-thin">
            by {project.author}
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
          {project.description}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {project.display_categories.slice(0, 5).map((cat) => (
            <span
              key={cat}
              className="rounded-sm bg-(--chip-bg) px-1.5 py-0.5 text-[0.65rem] font-thin tracking-wider text-(--chip-fg) uppercase"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>

      <div className="text-muted-foreground flex shrink-0 flex-col items-end gap-1 text-xs font-thin tabular-nums">
        <span className="flex items-center gap-1.5">
          <Download className="size-3.5" />
          {formatNumber(project.downloads)}
        </span>
        <span className="flex items-center gap-1.5">
          <Heart className="size-3.5" />
          {formatNumber(project.follows)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {timeAgo(project.date_modified)}
        </span>
      </div>
      <div className="relative">
        <button
          onClick={handleDownloadClick}
          disabled={isInstalled || isInstalling}
          className={[
            'flex h-10 shrink-0 items-center justify-center gap-1 rounded-md border px-3 transition-colors disabled:opacity-50',
            isInstalled
              ? 'border-emerald-500/50 text-emerald-500'
              : 'border-(--surface-border) bg-transparent text-(--saturn-fg-muted) hover:border-(--chip-border-hover) hover:bg-(--chip-bg-hover) hover:text-(--chip-fg-hover)',
          ].join(' ')}
        >
          {isInstalled ? (
            <Check className="size-4" />
          ) : isInstalling ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Download className="size-4" />
              <ChevronDown className="size-3" />
            </>
          )}
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              className="bg-background absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-md border border-(--hairline) shadow-xl"
            >
              {versionData?.loading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="text-saturn-500 size-5 animate-spin" />
                </div>
              ) : versionData?.data?.length > 0 ? (
                <div className="flex max-h-64 flex-col overflow-y-auto overscroll-contain">
                  <div className="text-muted-foreground bg-(--surface-hover) px-3 py-2 text-xs font-thin tracking-wider uppercase">
                    Select Version
                  </div>
                  {versionData.data.map((ver) => (
                    <button
                      key={ver.id}
                      onClick={() => {
                        void installMod(
                          uuid,
                          project.project_id,
                          ver.id,
                          ver.name,
                          activeTab
                        );
                        setOpenMenuId(null);
                      }}
                      className="flex flex-col items-start border-b border-(--hairline) px-3 py-2 text-left transition-colors last:border-0 hover:bg-(--surface-hover)"
                    >
                      <span className="text-foreground w-full truncate text-sm font-medium">
                        {ver.name}
                      </span>
                      <span className="text-muted-foreground text-[0.65rem] font-thin">
                        {ver.version_number} • {timeAgo(ver.date_published)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground p-4 text-center text-sm font-thin">
                  No compatible versions found.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
