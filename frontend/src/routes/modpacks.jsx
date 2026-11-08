import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  Cpu,
  Download,
  Feather,
  Flame,
  Heart,
  Layers,
  Loader2,
  Map,
  Package,
  Scroll,
  Search,
  Sword,
  Tag,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';

import {
  clearCategories,
  fetchCategories,
  fetchDiscovery,
  resetBrowser,
  setSortBy,
  toggleCategory,
  useModrinth,
} from '@/stores/modrinth';
import { ProjectDetailsModal } from '@/components/ui/project-details-modal.jsx';
import { TooltipLayer } from '@/components/ui/tooltip-layer.jsx';
import { ToastContainer } from '@/components/ui/toast-container.jsx';
import { formatNumber, timeAgo } from '@/lib/utils';

import fabricLogo from '@/assets/logos/fabric.png';
import quiltLogo from '@/assets/logos/quilt.png';
import neoforgeLogo from '@/assets/logos/neoforge.png';

export const Route = createFileRoute('/modpacks')({
  component: ModpacksBrowser,
});

const EASE = [0.22, 1, 0.38, 1];

const LOADER_ICONS = {
  fabric: fabricLogo,
  quilt: quiltLogo,
  neoforge: neoforgeLogo,
};

const CATEGORY_ICONS = {
  adventure: Map,
  challenging: Flame,
  combat: Sword,
  'kitchen-sink': Layers,
  lightweight: Feather,
  magic: Wand2,
  multiplayer: Users,
  optimization: Zap,
  quests: Scroll,
  technology: Cpu,
};

function ModpacksBrowser() {
  const navigate = useNavigate();

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
  const [selectedLoaders, setSelectedLoaders] = useState([]);
  const [detailsProject, setDetailsProject] = useState(null);

  const [sortOpen, setSortOpen] = useState(false);
  const sortContainerRef = useRef(null);
  const sortTriggerRef = useRef(null);
  const [sortDropdownPos, setSortDropdownPos] = useState({ top: 0, right: 0 });
  const searchRef = useRef(null);

  useEffect(() => {
    void fetchCategories();

    return () => {
      clearCategories();
      resetBrowser();
    };
  }, []);

  useEffect(() => {
    if (query.length > 0 && query.length < 3) {
      return;
    }

    const timer = setTimeout(() => {
      const allFilters = [...selectedCategories, ...selectedLoaders].join(',');

      void fetchDiscovery('', '', query, 'modpack', allFilters, '');
    }, 600);

    return () => clearTimeout(timer);
  }, [query, selectedLoaders, selectedCategories]);

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

  useLayoutEffect(() => {
    if (!sortOpen || !sortTriggerRef.current) return;
    const rect = sortTriggerRef.current.getBoundingClientRect();
    setSortDropdownPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
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

  const modpackCategories = availableCategories.filter(
    (c) => c.project_type === 'modpack'
  );

  const groupedCategories = modpackCategories.reduce((acc, cat) => {
    const header = cat.header || 'Categories';
    if (!acc[header]) acc[header] = [];
    acc[header].push(cat);
    return acc;
  }, {});

  const toggleLoader = (loader) => {
    setSelectedLoaders((prev) =>
      prev.includes(loader)
        ? prev.filter((l) => l !== loader)
        : [...prev, loader]
    );
  };

  const clearAllFilters = () => {
    setSelectedLoaders([]);
    clearCategories();
  };

  const handleSearch = (e) => {
    setQuery(e.target.value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="bg-background relative flex h-screen w-full flex-col overflow-hidden"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-144 w-4xl -translate-x-1/2 rounded-full bg-(--orb-1) blur-[120px]" />
        <div className="absolute -right-32 bottom-0 h-112 w-160 rounded-full bg-(--orb-2) blur-[100px]" />
        <div className="absolute top-1/3 -left-32 h-96 w-lg rounded-full bg-(--orb-3) blur-[90px]" />
      </div>
      {/* Main stuff */}
      <div className="relative z-10 flex h-full w-full gap-6 p-6">
        {/* Sidebar again */}
        <aside className="hidden w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-(--hairline) pr-4 md:flex">
          <div className="flex items-center justify-between">
            <h6 className="text-muted-foreground text-xs font-normal tracking-[0.2em] uppercase">
              Filter options
            </h6>
            {(selectedLoaders.length > 0 || selectedCategories.length > 0) && (
              <button
                onClick={clearAllFilters}
                className="text-saturn-400 hover:text-saturn-300 text-xs transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <h4 className="text-muted-foreground px-3 pb-1 text-[0.65rem] font-normal tracking-[0.2em] uppercase">
              Loaders
            </h4>
            {['fabric', 'quilt', 'neoforge'].map((loader) => {
              const isSelected = selectedLoaders.includes(loader);
              let hasIcon = false;
              if (LOADER_ICONS[loader]) {
                hasIcon = true;
              }
              const iconSrc = LOADER_ICONS[loader];

              return (
                <button
                  key={loader}
                  onClick={() => toggleLoader(loader)}
                  className={[
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm capitalize transition-colors',
                    isSelected
                      ? 'bg-(--chip-bg-hover) text-(--chip-fg-hover)'
                      : 'text-(--saturn-fg-muted) hover:bg-(--surface-hover) hover:text-(--saturn-fg)',
                  ].join(' ')}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {hasIcon ? (
                      <img src={iconSrc} alt="" className="size-4 shrink-0" />
                    ) : (
                      <Package className="size-4 shrink-0" />
                    )}
                    <span>{loader}</span>
                  </div>
                  {isSelected && <Check className="size-4 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Categories */}
          {categoriesLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-9 animate-pulse rounded-md bg-(--surface-hover)"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.keys(groupedCategories).map((header) => (
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
          <Link
            to={'/instances'}
            data-tooltip="Back to instances"
            className="mt-auto flex items-center justify-center gap-2 rounded-md border border-(--hairline) px-4 py-2.5 text-sm font-thin tracking-wide text-(--nav-link-fg) transition-colors hover:border-(--surface-border-hover) hover:text-(--nav-link-fg-hover)"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Instances
          </Link>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-6 flex items-center gap-4">
            {/*<button*/}
            {/*  onClick={() => navigate({ to: '/instances' })}*/}
            {/*  data-tooltip="Back to instances"*/}
            {/*  className="flex size-10 items-center justify-center rounded-md border border-(--hairline) text-(--saturn-fg-muted) transition-colors hover:bg-(--surface-hover)"*/}
            {/*>*/}
            {/*  <ChevronLeft className="size-5" />*/}
            {/*</button>*/}

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

            {/* Sorting */}
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
          {/*Results of teh search*/}
          <div className="min-h-0 flex-1 scrollbar-gutter-stable overflow-y-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-8 animate-spin text-(--saturn-500)" />
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-(--danger-fg)">
                <AlertTriangle className="size-8" />
                <p className="font-thin">{error}</p>
              </div>
            ) : sortedResults.length === 0 ? (
              <div className="text-muted-foreground flex h-full items-center justify-center font-thin">
                No modpacks found.
              </div>
            ) : (
              <div className="flex flex-col gap-3 pb-8">
                {sortedResults.map((mp) => (
                  <ModpackRow
                    key={mp.project_id}
                    project={mp}
                    onClick={() => setDetailsProject(mp)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {detailsProject && (
          <ProjectDetailsModal
            project={detailsProject}
            uuid=""
            instanceVersion=""
            activeTab="modpack"
            initialTab="description"
            onClose={() => setDetailsProject(null)}
            isModpack={true}
          />
        )}
      </AnimatePresence>
      <ToastContainer />
      <TooltipLayer />
    </motion.div>
  );
}

function ModpackRow({ project, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onClick={onClick}
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
          {project.display_categories?.slice(0, 5).map((cat) => (
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
    </motion.div>
  );
}
