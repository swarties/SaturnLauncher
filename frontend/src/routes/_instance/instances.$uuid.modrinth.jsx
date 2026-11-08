import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Apple,
  Book,
  Bug,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  Coins,
  Compass,
  Cpu,
  Database,
  Download,
  Gamepad2,
  Ghost,
  Globe,
  Heart,
  Loader2,
  Paintbrush,
  Search,
  Server,
  Sword,
  Tag,
  Trophy,
  Users,
  Wand2,
  Wrench,
  Zap,
} from 'lucide-react';
import { useInstance } from '@/stores/instance';
import {
  clearCategories,
  fetchCategories,
  fetchDiscovery,
  getLoader,
  resetBrowser,
  setSortBy,
  toggleCategory,
  useModrinth,
} from '@/stores/modrinth';
import { formatNumber, timeAgo } from '@/lib/utils';
import { ProjectDetailsModal } from '@/components/ui/project-details-modal.jsx';

export const Route = createFileRoute('/_instance/instances/$uuid/modrinth')({
  validateSearch: (search) => ({
    tab: search.tab || 'mod',
  }),

  component: ModrinthBrowser,
});

const TABS = [
  { id: 'mod', label: 'Mods' },
  { id: 'resourcepack', label: 'Resource Packs' },
  { id: 'shader', label: 'Shaders' },
];

const CATEGORY_ICONS = {
  adventure: Compass,
  cursed: Ghost,
  decoration: Paintbrush,
  economy: Coins,
  equipment: Sword,
  food: Apple,
  'game-mechanics': Gamepad2,
  library: Book,
  magic: Wand2,
  management: Server,
  minigame: Trophy,
  mobs: Bug,
  optimization: Zap,
  social: Users,
  storage: Database,
  technology: Cpu,
  transportation: Car,
  utility: Wrench,
  worldgen: Globe,
};

function ModrinthBrowser() {
  const { uuid } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const { data: instance } = useInstance();
  const {
    results,
    loading,
    error,
    sortBy,
    availableCategories,
    categoriesLoading,
    selectedCategories,
  } = useModrinth();

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState(tab);
  const [detailsProject, setDetailsProject] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const searchRef = useRef(null);

  const [sortOpen, setSortOpen] = useState(false);
  const sortContainerRef = useRef(null);
  const sortTriggerRef = useRef(null);
  const [sortDropdownPos, setSortDropdownPos] = useState({ top: 0, right: 0 });
  const prevQueryRef = useRef(query);

  const EASE = [0.22, 1, 0.38, 1];

  useEffect(() => {
    void fetchCategories();
    return () => resetBrowser();
  }, []);

  const isNotVanilla = Boolean(
    instance?.fabricVersion ||
    instance?.quiltVersion ||
    instance?.neoForgeVersion
  );

  useEffect(() => {
    if (!isNotVanilla && activeTab === 'mod') {
      setActiveTab('resourcepack');
    }
  }, [isNotVanilla, activeTab]);

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

  useLayoutEffect(() => {
    if (!sortOpen || !sortTriggerRef.current) return;
    const rect = sortTriggerRef.current.getBoundingClientRect();
    setSortDropdownPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, [sortOpen]);

  useEffect(() => {
    if (!sortOpen) return;

    const onDown = (e) => {
      const el = e.target;
      if (sortContainerRef.current?.contains(el)) return;
      if (el instanceof Element && el.closest('[data-sort-dropdown]')) return;
      setSortOpen(false);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSortOpen(false);
      }
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [sortOpen]);

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

    if (query.length > 0 && query.length < 3) {
      return;
    }

    const isTyping = query !== prevQueryRef.current;
    prevQueryRef.current = query;

    const delay = isTyping ? 600 : 0;

    const loaderString = getLoader(instance);

    const timer = setTimeout(() => {
      const catString = selectedCategories.join(',');
      void fetchDiscovery(
        uuid,
        instance.version,
        query,
        activeTab,
        catString,
        loaderString
      );
    }, delay);

    return () => clearTimeout(timer);
  }, [instance?.version, activeTab, query, uuid, selectedCategories]);

  const handleSearch = (e) => {
    setQuery(e.target.value);
  };

  const handleTabChange = (tabId) => {
    clearCategories();
    setActiveTab(tabId);
  };

  const filteredCategories = availableCategories.filter(
    (c) => c.project_type === activeTab
  );

  const groupedCategories = filteredCategories.reduce((acc, cat) => {
    const header = cat.header || 'Categories';
    if (!acc[header]) acc[header] = [];
    acc[header].push(cat);
    return acc;
  }, {});

  const sortedHeader = Object.keys(groupedCategories).sort((a, b) => {
    if (a === 'Categories') return -1;
    if (b === 'Categories') return 1;
    return a.localeCompare(b);
  });

  const activeIndex = TABS.findIndex((t) => t.id === activeTab);
  const targetIndex = hoveredIndex ?? activeIndex;

  const getBackRoute = () => {
    if (activeTab === 'resourcepack') return '/instances/$uuid/resourcepacks';
    if (activeTab === 'shader') return '/instances/$uuid/shaderpacks';
    return '/instances/$uuid/mods';
  };

  if (!instance) return null;

  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === 'mod') return isNotVanilla;
    if (tab.id === 'shader') return isNotVanilla;
    return true;
  });

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-full w-full gap-6">
        <aside className="hidden w-56 shrink-0 flex-col gap-4 overflow-y-auto overscroll-contain border-r border-(--hairline) pr-4 md:flex">
          <div className="flex items-center justify-between">
            <h6 className="text-muted-foreground text-xs font-normal tracking-[0.2em] uppercase">
              Filter options
            </h6>
            {selectedCategories.length > 0 && (
              <button
                onClick={clearCategories}
                className="text-saturn-400 hover:text-saturn-300 text-xs transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {categoriesLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-9 animate-pulse rounded-md bg-(--surface-hover)"
                />
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <p className="text-muted-foreground px-3 text-xs font-thin">
              No categories available.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {sortedHeader.map((header) => (
                <div key={header} className="flex flex-col gap-1">
                  <h4 className="text-muted-foreground px-3 pb-1 text-[0.65rem] font-normal tracking-[0.2em] uppercase">
                    {header}
                  </h4>
                  {groupedCategories[header].map((cat) => {
                    const isSelected = selectedCategories.includes(cat.name);
                    const Icon = CATEGORY_ICONS[cat.name] || Tag;
                    return (
                      <button
                        key={cat.name}
                        onClick={() => toggleCategory(cat.name)}
                        className={[
                          'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                          isSelected
                            ? 'bg-(--chip-bg-hover) text-(--chip-fg-hover)'
                            : 'text-(--saturn-fg-muted) hover:bg-(--surface-hover) hover:text-(--saturn-fg)',
                        ].join(' ')}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate capitalize">
                            {cat.name.replace(/-/g, ' ')}
                          </span>
                        </div>
                        {isSelected && <Check className="size-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => navigate({ to: getBackRoute(), params: { uuid } })}
              data-tooltip="Back to instance"
              className="flex size-10 items-center justify-center rounded-md border border-(--hairline) text-(--saturn-fg-muted) transition-colors hover:bg-(--surface-hover)"
            >
              <ChevronLeft className="size-5" />
            </button>
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="text"
                ref={searchRef}
                placeholder="Search Modrinth..."
                value={query}
                onChange={handleSearch}
                className="bg-background h-10 w-full rounded-md border border-(--hairline) pr-4 pl-9 text-sm outline-none focus:border-(--chip-border-hover)"
              />
            </div>
            <div ref={sortContainerRef} className="relative">
              <div
                ref={sortTriggerRef}
                className="bg-background flex h-10 min-w-32 items-stretch overflow-hidden rounded-md border border-(--hairline)"
              >
                <span className="flex flex-1 items-center px-4 text-sm font-normal tracking-wide text-(--saturn-fg) capitalize transition-colors hover:bg-(--surface-hover) hover:text-(--saturn-fg-hover)">
                  {sortBy}
                </span>
                <button
                  type="button"
                  onClick={() => setSortOpen((o) => !o)}
                  data-tooltip="Sort results"
                  aria-expanded={sortOpen}
                  className="flex items-center px-3.5 text-(--saturn-fg-muted) transition-colors outline-none hover:bg-(--surface-active) hover:text-(--saturn-fg-strong)"
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-4 transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
              {createPortal(
                <AnimatePresence>
                  {sortOpen && (
                    <motion.div
                      data-sort-dropdown
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15, ease: EASE }}
                      style={{
                        position: 'fixed',
                        top: sortDropdownPos.top,
                        right: sortDropdownPos.right,
                      }}
                      className="bg-background z-60 w-48 overflow-hidden rounded-md border border-(--hairline) shadow-lg shadow-black/60"
                    >
                      {['relevance', 'downloads', 'updated'].map((opt) => {
                        const selected = sortBy === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => {
                              setSortBy(opt);
                              setSortOpen(false);
                            }}
                            className={[
                              'flex w-full items-center px-3.5 py-2.5 text-left text-sm font-normal tracking-wide capitalize transition-colors',
                              selected
                                ? 'bg-(--surface-active) text-(--saturn-fg-strong)'
                                : 'text-(--saturn-fg-muted) hover:bg-(--surface-hover) hover:text-(--saturn-fg)',
                            ].join(' ')}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>,
                document.body
              )}
            </div>
          </div>
          {/* Tabs */}
          <div
            onMouseLeave={() => setHoveredIndex(null)}
            className="mb-6 flex gap-1 border-b border-(--hairline) pb-4"
          >
            {visibleTabs.map((t, index) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onClick={() => handleTabChange(t.id)}
                  className={`relative rounded-md px-4 py-1.5 text-sm font-normal tracking-wide transition-colors ${
                    isActive
                      ? 'text-(--chip-fg-hover)'
                      : 'text-(--saturn-fg-muted)'
                  }`}
                >
                  {targetIndex === index && (
                    <motion.div
                      layoutId="search-tab-bg"
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

          {/* Results */}
          <div className="min-h-0 flex-1 scrollbar-gutter-stable overflow-y-auto">
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
                  {sortedResults.map((project) => (
                    <ProjectRow
                      key={project.project_id}
                      project={project}
                      onOpenDetails={(tab = 'description') => {
                        setDetailsProject({ project, tab });
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
          <AnimatePresence>
            {detailsProject && (
              <ProjectDetailsModal
                key={`${detailsProject.project.project_id}:${detailsProject.tab}`}
                project={detailsProject.project}
                uuid={uuid}
                instanceVersion={instance.version}
                activeTab={activeTab}
                initialTab={detailsProject.tab}
                onClose={() => setDetailsProject(null)}
                loader={getLoader(instance)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({ project, onOpenDetails }) {
  const { installed } = useModrinth();

  const isInstalled = installed[project.project_id] || project.isInstalled;

  const handleDownloadClick = () => {
    if (isInstalled) return;
    onOpenDetails('versions');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onClick={() => onOpenDetails('description')}
      className="group bg-background relative flex cursor-pointer items-center gap-4 rounded-md border border-(--hairline) p-4 transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover)"
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
              className="rounded-sm bg-(--chip-bg) px-1.5 py-0.5 text-[0.7rem] font-normal tracking-wider text-(--chip-fg) uppercase"
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
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleDownloadClick}
          disabled={isInstalled}
          data-tooltip="Choose version"
          className={[
            'flex h-10 shrink-0 items-center justify-center gap-1 rounded-md border px-3 transition-colors disabled:opacity-50',
            isInstalled
              ? 'border-emerald-500/50 text-emerald-500'
              : 'border-(--surface-border) bg-transparent text-(--saturn-fg-muted) hover:border-(--chip-border-hover) hover:bg-(--chip-bg-hover) hover:text-(--chip-fg-hover)',
          ].join(' ')}
        >
          {isInstalled ? (
            <Check className="size-4" />
          ) : (
            <Download className="size-4" />
          )}
        </button>
      </div>
    </motion.div>
  );
}
