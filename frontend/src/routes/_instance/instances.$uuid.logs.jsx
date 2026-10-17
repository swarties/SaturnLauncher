import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { FolderOpen, Search } from 'lucide-react';

import { useLaunch } from '@/stores/launch';
import { loadLogs, useLogs } from '@/stores/logs';
import { OpenInstanceFolder } from '../../../wailsjs/go/main/App';

export const Route = createFileRoute('/_instance/instances/$uuid/logs')({
  component: LogsTab,
});

function LogsTab() {
  const { uuid } = Route.useParams();
  const { logs } = useLogs();
  const { instances } = useLaunch();

  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL'); // 'ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'

  const phase = instances[uuid]?.phase ?? 'idle';
  const isLive = phase === 'running' || phase === 'launching';

  useEffect(() => {
    loadLogs(uuid);
  }, [uuid]);

  const entry = logs[uuid];
  const allLines = entry?.lines ?? [];

  const filtered = useMemo(() => {
    let result = allLines;

    if (levelFilter !== 'ALL') {
      result = result.filter((l) => l.level === levelFilter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((l) => l.message.toLowerCase().includes(q));
    }

    return result;
  }, [allLines, query, levelFilter]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <LogsHeader
        query={query}
        onQueryChange={setQuery}
        isLive={isLive}
        onOpenFolder={() => void OpenInstanceFolder(uuid)}
      />
      <div className="flex shrink-0 items-center gap-2">
        {['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setLevelFilter(lvl)}
            className={[
              'h-7 rounded-md border px-3 text-[0.65rem] font-thin tracking-widest uppercase transition-colors',
              levelFilter === lvl
                ? 'border-(--chip-border-hover) bg-(--chip-bg-hover) text-(--chip-fg-hover)'
                : 'text-muted-foreground border-(--hairline) hover:border-(--surface-border-hover) hover:bg-(--surface-hover) hover:text-(--saturn-fg)',
            ].join(' ')}
          >
            {lvl}
          </button>
        ))}
      </div>
      <LogViewer
        lines={filtered}
        loading={entry?.loading ?? true}
        error={entry?.error ?? null}
        isLive={isLive}
        hasAny={allLines.length > 0}
      />
    </div>
  );
}

function LogsHeader({ query, onQueryChange, onOpenFolder, isLive }) {
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
          placeholder="Search logs..."
          data-tooltip="Filter logs"
          aria-label="Filter logs"
          className="bg-background text-foreground placeholder:text-muted-foreground/50 h-10 w-full rounded-md border border-(--hairline) pr-4 pl-9 font-mono text-sm transition-colors outline-none focus:border-(--chip-border-hover)"
        />
      </div>
      {isLive && (
        <span className="flex h-10 items-center gap-2 rounded-md border border-(--danger-border) bg-(--danger-bg) px-3 text-xs font-normal tracking-[0.15em] text-(--danger-fg) uppercase select-none">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-(--danger-fg) opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-(--danger-fg)" />
          </span>
          Live
        </span>
      )}
      <button
        type="button"
        onClick={onOpenFolder}
        data-tooltip="Open instance folder"
        aria-label="Open instance folder"
        className="text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--hairline) transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) hover:text-(--saturn-fg-hover)"
      >
        <FolderOpen className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function LogViewer({ lines, loading, error, isLive, hasAny }) {
  const scrollRef = useRef(null);
  const pinnedRef = useRef(true);
  const isFirstLoadRef = useRef(true);
  const isAutoScrollingRef = useRef(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (isFirstLoadRef.current) {
      el.scrollTop = el.scrollHeight;
      isFirstLoadRef.current = false;
      return;
    }

    if (!pinnedRef.current) return;

    // Suppress onScroll handling while we drive the scroll ourselves.
    isAutoScrollingRef.current = true;
    el.scrollTop = el.scrollHeight;

    // Clear the suppression on the next frame, after the browser fires
    // the resulting scroll event.
    const raf = requestAnimationFrame(() => {
      isAutoScrollingRef.current = false;
    });
    return () => cancelAnimationFrame(raf);
  }, [lines]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (isAutoScrollingRef.current) return;

    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-md border bg-(--log-bg) contain-content select-text"
    >
      <div className="py-2">
        {error ? (
          <EmptyState>Failed to load logs: {error}</EmptyState>
        ) : loading ? (
          <EmptyState>Loading logs...</EmptyState>
        ) : !hasAny && isLive ? (
          <EmptyState>Loading...</EmptyState>
        ) : !hasAny ? (
          <EmptyState>
            No logs yet - launch this instance to see them.
          </EmptyState>
        ) : (
          lines.map((line) => <LogRow key={line.id} line={line} />)
        )}
      </div>
    </div>
  );
}

function LogRow({ line }) {
  return (
    <div className="flex items-start gap-3 px-4 py-0 font-mono text-xs leading-relaxed transition-colors hover:bg-(--surface-hover)">
      <span className="w-16 shrink-0 text-(--saturn-fg-muted) tabular-nums">
        {line.timestamp ?? ''}
      </span>
      <span className={`w-14 shrink-0 font-normal ${levelColor(line.level)}`}>
        {line.level ?? ''}
      </span>
      <span className="min-w-0 flex-1 wrap-break-word whitespace-pre-wrap text-(--saturn-fg)">
        {line.message}
      </span>
    </div>
  );
}

function levelColor(level) {
  switch (level) {
    case 'ERROR':
    case 'FATAL':
      return 'text-(--danger-fg)';
    case 'WARN':
      return 'text-(--warning-fg)';
    case 'DEBUG':
      return 'text-(--debug-fg)';
    default:
      return 'text-(--saturn-fg)';
  }
}

function EmptyState({ children }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <p className="text-muted-foreground text-center text-2xl font-thin">
        {children}
      </p>
    </div>
  );
}
