import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Compass,
  FileArchive,
  FolderOpen,
  Loader2,
  Package,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { CONTENT_TYPES } from '@/lib/content-types';
import {
  fetchContentUpdates,
  loadContent,
  patchContentItem,
  useContent,
} from '@/stores/content';
import { onFileDrop } from '@/lib/backend';
import { toast } from '@/stores/toasts';
import {
  ApplyContentUpdate,
  InstallContent,
  OpenContentFolder,
  RemoveContent,
  ToggleContent,
} from '../../../wailsjs/go/main/App';
import { useInstance } from '@/stores/instance';

const EASE = [0.22, 1, 0.38, 1];

export function ContentList({ uuid, contentType }) {
  const navigate = useNavigate();
  const config = CONTENT_TYPES[contentType];
  const { entries } = useContent();
  const { data: instance } = useInstance();

  const [query, setQuery] = useState('');
  const dragCounter = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    void loadContent(uuid, contentType);
  }, [uuid, contentType]);

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
    return onFileDrop(async (x, y, paths) => {
      setDragActive(false);
      dragCounter.current = 0;

      const zone = document
        .elementsFromPoint(x, y)
        .map((el) => el?.closest?.('[data-srm-list]'))
        .find(Boolean);

      if (zone && zone.dataset.uuid !== uuid) return;

      const validPaths = paths.filter((p) =>
        config.extensions.some((ext) => p.toLowerCase().endsWith(ext))
      );

      const invalidCount = paths.length - validPaths.length;

      if (validPaths.length === 0) {
        toast.error(
          `Only ${config.extensions.join(', ')} files can be dropped here`
        );
        return;
      }

      try {
        for (const path of validPaths) {
          await InstallContent(uuid, config.backendKey, path);
        }
        if (invalidCount > 0) {
          toast.info(
            `Installed ${validPaths.length} file(s). Ignored ${invalidCount} invalid file(s).`
          );
        }
      } catch (e) {
        toast.error(e?.message ?? String(e));
      }
    });
  }, [uuid, contentType, config]);

  const key = `${uuid}:${contentType}`;
  const entry = entries[key];
  const rawItems = entry?.items ?? [];

  const items = useMemo(() => {
    if (config.isShader === true) {
      return rawItems.filter((i) => i.isShader === true);
    }
    if (config.isShader === false) {
      return rawItems.filter((i) => i.isShader === false);
    }
    return rawItems;
  }, [rawItems, config.isShader]);

  if (!uuid) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-center text-sm font-thin text-red-400">
          Error: Missing Instance UUID. Please refresh the page.
        </p>
      </div>
    );
  }

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOrEnd = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);
  };

  const handleInstall = async () => {
    try {
      await InstallContent(uuid, config.backendKey, '');
    } catch (e) {
      toast.error(e?.message ?? String(e));
    }
  };

  const handleRemove = async (item) => {
    try {
      await RemoveContent(uuid, config.backendKey, item.filename);
    } catch (e) {
      toast.error(e?.message ?? String(e));
    }
  };

  const handleToggle = async (item) => {
    const newEnabled = !item.enabled;
    const newFilename = newEnabled
      ? item.filename.replace(/\.disabled$/i, '')
      : `${item.filename}.disabled`;

    patchContentItem(uuid, contentType, item.filename, (it) => ({
      ...it,
      enabled: newEnabled,
      filename: newFilename,
    }));

    try {
      await ToggleContent(uuid, config.backendKey, item.filename);
    } catch (e) {
      patchContentItem(uuid, contentType, newFilename, (it) => ({
        ...it,
        enabled: !newEnabled,
        filename: item.filename,
      }));
      toast.error(e?.message ?? String(e));
    }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        i.displayName.toLowerCase().includes(q) ||
        i.filename.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <ContentHeader
        query={query}
        onQueryChange={setQuery}
        onInstall={handleInstall}
        onOpenFolder={() => void OpenContentFolder(uuid, config.backendKey)}
        onBrowse={() =>
          navigate({
            to: '/instances/$uuid/modrinth',
            params: { uuid },
            search: { tab: config.projectType },
          })
        }
        searchRef={searchRef}
        uuid={uuid}
        config={config}
        instance={instance}
        items={rawItems}
        entry={entry}
      />

      <div
        data-srm-list
        data-uuid={uuid}
        data-content-type={contentType}
        data-drag-active={dragActive ? 'true' : undefined}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDropOrEnd}
        onDragEnd={handleDropOrEnd}
        style={
          /** @type {import('react').CSSProperties} */ ({
            '--wails-drop-target': 'drop',
          })
        }
        className="relative min-h-0 flex-1 overflow-hidden rounded-md"
      >
        <div className="drop-overlay">
          <PackagePlus className="text-saturn-300 size-12" aria-hidden="true" />
          <p className="text-saturn-50 text-xl font-thin tracking-wide">
            Drop file to install
          </p>
        </div>

        <div
          style={
            /** @type {import('react').CSSProperties} */ ({
              '--wails-drop-target': 'drop',
            })
          }
          className="h-full scrollbar-gutter-stable overflow-y-auto overscroll-contain"
        >
          {entry?.error ? (
            <EmptyState>Failed to load: {entry.error}</EmptyState>
          ) : (entry?.loading ?? true) && items.length === 0 ? (
            <EmptyState>Loading...</EmptyState>
          ) : items.length === 0 ? (
            <NoContentState
              config={config}
              onInstall={handleInstall}
              onBrowse={() =>
                navigate({
                  to: '/instances/$uuid/modrinth',
                  params: { uuid },
                  search: { tab: config.projectType },
                })
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState>No matches for &quot;{query}&quot;.</EmptyState>
          ) : (
            <div className="flex flex-col gap-2 pb-2">
              {filtered.map((item) => (
                <ContentRow
                  key={item.filename.replace(/\.disabled$/i, '')}
                  item={item}
                  onRemove={handleRemove}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContentHeader({
  query,
  onQueryChange,
  onInstall,
  onOpenFolder,
  onBrowse,
  searchRef,
  uuid,
  config,
  instance,
  items,
  entry,
}) {
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const handleOpenUpdates = () => {
    setIsUpdateModalOpen(true);
    void fetchContentUpdates(
      uuid,
      config.backendKey,
      config.projectType,
      instance?.version ?? ''
    );
  };

  useEffect(() => {
    if (!isUpdateModalOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsUpdateModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isUpdateModalOpen]);

  return (
    <div className="flex shrink-0 items-center gap-3">
      <div className="relative flex-1">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search..."
          data-tooltip="Filter content"
          aria-label="Filter content"
          className="bg-background text-foreground placeholder:text-muted-foreground/50 h-10 w-full rounded-md border border-(--hairline) pr-4 pl-9 font-mono text-sm transition-colors outline-none focus:border-(--chip-border-hover)"
        />
      </div>
      <button
        type="button"
        onClick={onBrowse}
        data-tooltip="Browse Modrinth"
        aria-label="Browse Modrinth"
        className="text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--hairline) transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) hover:text-(--saturn-fg-hover)"
      >
        <Compass className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onInstall}
        data-tooltip="Install from file"
        aria-label="Install from file"
        className="text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--hairline) transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) hover:text-(--saturn-fg-hover)"
      >
        <PackagePlus className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={handleOpenUpdates}
        data-tooltip="Check for updates"
        aria-label="Check for updates"
        disabled={entry?.updating}
        className="text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--hairline) transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) hover:text-(--saturn-fg-hover) disabled:pointer-events-none disabled:opacity-40"
      >
        <RefreshCw
          aria-hidden="true"
          className={`size-4 ${entry?.updating ? 'animate-spin' : ''}`}
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {isUpdateModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setIsUpdateModalOpen(false);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-(--backdrop) p-6 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.28, ease: EASE }}
                onMouseDown={(e) => e.stopPropagation()}
                className="bg-background relative flex max-h-[75vh] w-full max-w-3xl flex-col overflow-hidden rounded-md border-2 border-(--surface-border)"
              >
                <UpdateModal
                  uuid={uuid}
                  config={config}
                  items={items}
                  updates={entry?.updates ?? []}
                  updating={entry?.updating ?? false}
                  onClose={() => setIsUpdateModalOpen(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      <button
        type="button"
        onClick={onOpenFolder}
        data-tooltip="Open folder"
        aria-label="Open folder"
        className="text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--hairline) transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) hover:text-(--saturn-fg-hover)"
      >
        <FolderOpen className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function ContentRow({ item, onRemove, onToggle }) {
  const Icon = item.ext === '.jar' ? Package : FileArchive;

  return (
    <div
      style={
        /** @type {import('react').CSSProperties} */ ({
          '--wails-drop-target': 'drop',
        })
      }
      className="group bg-background flex items-center gap-3 rounded-md border border-(--hairline) px-3 py-2.5 transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover)"
    >
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-(--chip-bg) text-(--chip-fg)">
        {item.iconDataUrl ? (
          <img
            src={item.iconDataUrl}
            draggable="false"
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <Icon className="size-4" aria-hidden="true" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-foreground truncate text-sm font-normal">
          {item.displayName}
        </p>
        <p className="text-muted-foreground truncate text-xs font-thin">
          {item.version ? `v${item.version}` : item.filename}
        </p>
      </div>

      <span className="text-muted-foreground w-14 shrink-0 text-right text-xs font-thin tabular-nums">
        {formatSize(item.sizeBytes)}
      </span>
      <ContentSwitch enabled={item.enabled} onToggle={() => onToggle(item)} />
      <button
        type="button"
        onClick={() => onRemove(item)}
        aria-label={`Remove ${item.displayName}`}
        data-tooltip="Remove"
        className="text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-sm opacity-40 transition-[opacity,color] group-hover:opacity-100 hover:text-red-400"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function ContentSwitch({ enabled, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      data-tooltip={enabled ? 'Disable' : 'Enable'}
      onClick={onToggle}
      className={[
        'focus-visible:ring-offset-background relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-out focus-visible:ring-2 focus-visible:ring-(--chip-border-hover) focus-visible:ring-offset-2 focus-visible:outline-none',
        enabled ? 'bg-saturn-500' : 'bg-(--surface-active)',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none absolute size-3 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          enabled ? 'translate-x-4.5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

function NoContentState({ config, onInstall, onBrowse }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-12">
      <Package
        className="text-muted-foreground/60 size-12"
        aria-hidden="true"
      />
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-muted-foreground text-2xl font-thin">
          No {config.label} installed
        </p>
        <p className="text-muted-foreground text-sm font-thin">
          {config.emptyHint}
        </p>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onInstall}
          className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 group flex h-10 items-center gap-2 rounded-lg border px-5 text-sm font-thin transition-colors"
        >
          Install from file
          <Plus
            className="text-saturn-300 size-4 leading-none"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          onClick={onBrowse}
          className="group flex h-10 items-center gap-2 rounded-lg border border-(--chip-border) bg-(--chip-bg) px-5 text-sm font-thin text-(--chip-fg) transition-colors hover:border-(--chip-border-hover) hover:bg-(--chip-bg-hover) hover:text-(--chip-fg-hover)"
        >
          Browse Modrinth
          <Compass
            className="text-saturn-300 size-4 leading-none"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <p className="text-muted-foreground text-center text-sm font-thin">
        {children}
      </p>
    </div>
  );
}

function UpdateModal({ uuid, config, items, updates, updating, onClose }) {
  const [selected, setSelected] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  const getDisplayName = (oldFileName) => {
    const cleanName = oldFileName.replace(/\.disabled$/, '');
    const item = items.find(
      (i) => i.filename.replace(/\.disabled$/, '') === cleanName
    );
    return item?.displayName || cleanName.replace(/\.jar$/i, '');
  };

  const uniqueUpdates = useMemo(() => {
    const seen = new Set();
    return updates.filter((u) => {
      const cleanOldName = u.oldFileName.replace(/\.disabled$/, '');

      const existsInTab = items.some(
        (i) => i.filename.replace(/\.disabled$/, '') === cleanOldName
      );
      if (!existsInTab) return false;

      const key = u.projectId || getDisplayName(u.oldFileName);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [updates, items]);

  useEffect(() => {
    if (uniqueUpdates.length > 0) {
      const init = {};
      uniqueUpdates.forEach((update) => {
        init[update.oldFileName] = true;
      });
      setSelected(init);
    }
  }, [uniqueUpdates]);

  const toggle = (filename) => {
    setSelected((prev) => ({ ...prev, [filename]: !prev[filename] }));
  };

  const handleUpdate = async () => {
    const toUpdate = uniqueUpdates.filter((upd) => selected[upd.oldFileName]);
    if (toUpdate.length === 0) return;

    setActionLoading(true);
    try {
      for (const upd of toUpdate) {
        await ApplyContentUpdate(
          uuid,
          config.backendKey,
          upd.oldFileName,
          upd.newVersion,
          config.projectType
        );
      }
      toast.success(`Successfully updated ${toUpdate.length} items!`);
      onClose();
      void loadContent(uuid, config.backendKey, { silent: true });
    } catch (e) {
      toast.error(e?.message ?? 'Failed to apply updates.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="flex shrink-0 flex-col gap-2 border-b border-(--hairline) p-6 pb-4">
        <h2 className="text-foreground text-lg font-extralight tracking-tight">
          Available Updates
        </h2>
        <p className="text-muted-foreground text-sm font-thin">
          You're about to update the following resources.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {updating ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="text-saturn-500 size-6 animate-spin" />
          </div>
        ) : uniqueUpdates.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm font-thin">
            All {config.label} are up to date!
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {uniqueUpdates.map((upd) => {
              const isChecked = selected[upd.oldFileName];
              return (
                <button
                  key={upd.oldFileName}
                  type="button"
                  onClick={() => toggle(upd.oldFileName)}
                  className={[
                    'flex w-full cursor-pointer items-start gap-3 rounded-md border p-3 text-left transition-colors',
                    isChecked
                      ? 'border-(--chip-border-hover) bg-(--chip-bg-hover)'
                      : 'border-(--hairline) hover:bg-(--surface-hover)',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
                      isChecked
                        ? 'border-saturn-500 bg-saturn-500 text-white'
                        : 'border-(--hairline) bg-(--surface-active)',
                    ].join(' ')}
                  >
                    {isChecked && <Check className="size-3" />}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={[
                        'truncate text-sm font-normal',
                        isChecked
                          ? 'text-(--saturn-fg-strong)'
                          : 'text-foreground',
                      ].join(' ')}
                    >
                      {getDisplayName(upd.oldFileName)}
                    </span>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-thin">
                      <span>Provider: Modrinth</span>
                      <span className="truncate">
                        <span className="opacity-60">Old:</span>{' '}
                        {upd.oldFileName.replace('.jar', '')}
                      </span>
                      <span className="truncate text-emerald-500">
                        <span className="opacity-60">New:</span>{' '}
                        {upd.newFileName.replace('.jar', '')}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-(--hairline) p-6">
        <p className="text-muted-foreground text-xs font-thin">
          Only resources with a check will be updated!
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={actionLoading}
            className="text-muted-foreground h-10 rounded-md border-2 border-(--surface-border) px-4 text-sm font-thin transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) disabled:pointer-events-none disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={actionLoading || uniqueUpdates.length === 0}
            className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 flex h-10 items-center justify-center rounded-md border px-6 text-sm font-thin transition-colors disabled:pointer-events-none disabled:opacity-40"
          >
            {actionLoading ? 'Updating...' : 'OK'}
          </button>
        </div>
      </div>
    </>
  );
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
