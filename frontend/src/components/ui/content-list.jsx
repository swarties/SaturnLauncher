import { useEffect, useMemo, useState } from 'react';
import {
  FileArchive,
  FolderOpen,
  Package,
  PackagePlus,
  Plus,
  Search,
  X,
} from 'lucide-react';

import { CONTENT_TYPES } from '@/lib/content-types';
import { loadContent, useContent } from '@/stores/content';
import { onFileDrop } from '@/lib/backend';
import {
  InstallContent,
  OpenContentFolder,
  RemoveContent,
} from '../../../wailsjs/go/main/App';

export function ContentList({ uuid, contentType }) {
  const config = CONTENT_TYPES[contentType];
  const { entries } = useContent();
  const key = `${uuid}:${contentType}`;
  const entry = entries[key];
  const items = entry?.items ?? [];

  const [query, setQuery] = useState('');
  const [dropMessage, setDropMessage] = useState(null);

  useEffect(() => {
    void loadContent(uuid, contentType);
  }, [uuid, contentType]);

  useEffect(() => {
    const off = onFileDrop((x, y, paths) => {
      const els = document.elementsFromPoint(x, y);
      const zone = els.find((el) => el?.hasAttribute?.('data-srm-list'));
      if (!zone) return;
      if (zone.dataset.uuid !== uuid) return;

      const allowed = paths.every((p) =>
        config.extensions.some((ext) => p.toLowerCase().endsWith(ext))
      );
      if (!allowed) {
        setDropMessage(
          `Only ${config.extensions.join(', ')} files can be dropped here.`
        );
        window.setTimeout(() => setDropMessage(null), 4000);
        return;
      }

      setDropMessage('Backend endpoint pending - install from file instead!');
      window.setTimeout(() => setDropMessage(null), 4000);
    });
    return () => {
      if (typeof off === 'function') off();
    };
  }, [uuid, contentType, config]);

  const handleInstall = async () => {
    try {
      await InstallContent(uuid, config.backendKey);
    } catch (e) {
      setDropMessage(e?.message ?? String(e));
      window.setTimeout(() => setDropMessage(null), 4000);
    }
  };

  const handleRemove = async (item) => {
    try {
      await RemoveContent(uuid, config.backendKey, item.filename);
    } catch (e) {
      setDropMessage(e?.message ?? String(e));
      window.setTimeout(() => setDropMessage(null), 4000);
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
      />

      {dropMessage && (
        <p className="shrink-0 text-xs font-thin text-(--warning-fg)">
          {dropMessage}
        </p>
      )}

      <div
        data-srm-list
        data-uuid={uuid}
        data-content-type={contentType}
        style={{ '--wails-drop-target': 'copy' }}
        className="relative min-h-0 flex-1"
      >
        <div className="h-full overflow-y-auto overscroll-contain rounded-md">
          {entry?.error ? (
            <EmptyState>Failed to load: {entry.error}</EmptyState>
          ) : (entry?.loading ?? true) && items.length === 0 ? (
            <EmptyState>Loading...</EmptyState>
          ) : items.length === 0 ? (
            <NoContentState
              contentType={contentType}
              config={config}
              onInstall={handleInstall}
            />
          ) : filtered.length === 0 ? (
            <EmptyState>No matches for &quot;{query}&quot;.</EmptyState>
          ) : (
            <div className="flex flex-col gap-2 pb-2">
              {filtered.map((item) => (
                <ContentRow
                  key={item.filename}
                  item={item}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContentHeader({ query, onQueryChange, onInstall, onOpenFolder }) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <div className="relative flex-1">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
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
        onClick={onInstall}
        data-tooltip="Install from file"
        aria-label="Install from file"
        className="text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--hairline) transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) hover:text-(--saturn-fg-hover)"
      >
        <PackagePlus className="size-4" aria-hidden="true" />
      </button>
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

function ContentRow({ item, onRemove }) {
  const Icon = item.ext === '.jar' ? Package : FileArchive;

  return (
    <div className="group bg-background flex items-center gap-3 rounded-md border border-(--hairline) px-3 py-2.5 transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover)">
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-(--chip-bg) text-(--chip-fg)">
        {item.iconUrl ? (
          <img
            src={item.iconUrl}
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
      <ContentSwitch enabled={item.enabled} />
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

function ContentSwitch({ enabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-disabled="true"
      data-tooltip="Toggle pending backend"
      onClick={(e) => e.preventDefault()}
      className={[
        'relative inline-flex h-4 w-8 shrink-0 cursor-not-allowed items-center rounded-full opacity-80 transition-colors',
        enabled ? 'bg-saturn-500' : 'bg-(--surface-active)',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none absolute size-3 rounded-full bg-white shadow-sm transition-transform',
          enabled ? 'translate-x-4.5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

function NoContentState({ config, onInstall }) {
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

function formatSize(bytes) {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
