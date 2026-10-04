import { useEffect, useRef, useState } from 'react';

import { ListInstances } from '../../../wailsjs/go/main/App';
import { onBackendEvent } from '@/lib/backend';
import { useAuth } from '@/stores/auth';

/** @typedef {{ name: string, version: string, uuid: string, timecreated: string, minram: number, maxram: number}} McInstance */

const VIEW_MODES = ['spaced', 'cramped'];
const DEFAULT_VIEW_MODE = 'spaced';

// Pre-measurement guess for row height, in CSS pixels. Only used to compute
// how many ghost slots fit before a real row has been measured. Not styling.
const ROW_HEIGHT_FALLBACK = { spaced: 62, cramped: 30 };
const LIST_GAP = 6; // matches gap-1.5 on the rows container
const LIST_PADDING = 16; // matches p-2 top + bottom on the rows container

/**
 * Instance picker for the Home page. Self-contained: fetches the list,
 * reconciles the persisted selection against what actually exists, and
 * notifies the parent whenever the effective selection changes.
 *
 * Persistence keys are scoped per-account: `saturn.activeInstance.{uuid}`
 * and `saturn.instanceView.{uuid}`. Ready for multi-account later.
 *
 * @param {{ onSelectionChange: (instance: McInstance | null) => void }} props
 */
export function InstanceSelector({ onSelectionChange }) {
  const { profile } = useAuth();
  const scopeKey = profile?.id ?? null;

  const [instances, setInstances] = useState(/** @type {McInstance[]} */ ([]));
  const [selectedUuid, setSelectedUuid] = useState(
    /** @type {string | null} */ (null)
  );
  const [viewMode, setViewMode] = useState(
    /** @type {'spaced' | 'cramped'} */ (DEFAULT_VIEW_MODE)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const [rowHeight, setRowHeight] = useState(0);
  const [ghostCount, setGhostCount] = useState(0);

  const onSelectionChangeRef = useRef(onSelectionChange);
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      ListInstances()
        .then((list) => {
          if (cancelled) return;
          setInstances(/** @type {McInstance[]} */ (list ?? []));
          setError(null);
        })
        .catch((e) => {
          if (cancelled) return;
          setError(e?.message ?? String(e));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    load();
    const off = onBackendEvent('instance:changed', load);

    return () => {
      cancelled = true;
      if (typeof off === 'function') off();
    };
  }, []);

  useEffect(() => {
    if (!scopeKey || typeof window === 'undefined') return;
    setSelectedUuid(
      window.localStorage.getItem(`saturn.activeInstance.${scopeKey}`)
    );
    const storedView = window.localStorage.getItem(
      `saturn.instanceView.${scopeKey}`
    );
    if (VIEW_MODES.includes(storedView)) setViewMode(storedView);
  }, [scopeKey]);

  useEffect(() => {
    if (loading) return;
    const stillExists = instances.some((i) => i.uuid === selectedUuid);
    if (!stillExists) {
      setSelectedUuid(instances[0]?.uuid ?? null);
    }
  }, [instances, selectedUuid, loading]);

  const lastNotifiedRef = useRef(/** @type {string | null} */ (null));
  useEffect(() => {
    const selected = instances.find((i) => i.uuid === selectedUuid) ?? null;

    const selectedId = selected?.uuid ?? null;
    if (selectedId !== lastNotifiedRef.current) {
      lastNotifiedRef.current = selectedId;
      onSelectionChangeRef.current(selected);
    }

    if (!scopeKey || !selectedId || typeof window === 'undefined') return;
    window.localStorage.setItem(
      `saturn.activeInstance.${scopeKey}`,
      selectedId
    );
  }, [selectedUuid, instances, scopeKey]);

  useEffect(() => {
    if (!scopeKey || typeof window === 'undefined') return;
    window.localStorage.setItem(`saturn.instanceView.${scopeKey}`, viewMode);
  }, [viewMode, scopeKey]);

  useEffect(() => {
    const el = contentRef.current?.querySelector('[data-instance-row]');
    if (!el) return;
    setRowHeight(el.getBoundingClientRect().height);
  }, [instances, viewMode]);

  useEffect(() => {
    const scroll = scrollRef.current;
    const content = contentRef.current;
    if (!scroll || !content) return;

    const rowH = rowHeight || ROW_HEIGHT_FALLBACK[viewMode];

    const measure = () => {
      const available = scroll.clientHeight - LIST_PADDING;
      const used = content.getBoundingClientRect().height;
      const remaining = Math.max(0, available - used - LIST_GAP - 4);
      setGhostCount(Math.floor(remaining / (rowH + LIST_GAP)));
    };

    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(scroll);
    obs.observe(content);
    return () => obs.disconnect();
  }, [instances, viewMode, rowHeight]);

  const countLabel = loading
    ? 'Loading...'
    : `${instances.length} ${instances.length === 1 ? 'instance' : 'instances'}`;

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm font-thin tracking-[0.2em] uppercase">
            Instance
          </p>
          <p className="text-muted-foreground mt-1 text-xs font-thin">
            {countLabel}
          </p>
        </div>
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {/* List */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-(--hairline)">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {error && (
            <div className="flex h-full items-center justify-center p-4">
              <p className="text-center text-xs font-thin text-red-400">
                {error}
              </p>
            </div>
          )}

          {!error && loading && (
            <div className="flex flex-col gap-1.5 p-2">
              <SkeletonRow viewMode={viewMode} />
              <SkeletonRow viewMode={viewMode} />
              <SkeletonRow viewMode={viewMode} />
            </div>
          )}

          {!error && !loading && (
            <div className="relative flex flex-col gap-1.5 p-2">
              <div ref={contentRef} className="flex flex-col gap-1.5">
                {instances.map((inst) => (
                  <InstanceRow
                    key={inst.uuid}
                    instance={inst}
                    selected={inst.uuid === selectedUuid}
                    viewMode={viewMode}
                    onSelect={() => setSelectedUuid(inst.uuid)}
                  />
                ))}
              </div>

              {ghostCount > 0 && (
                <div aria-hidden="true" className="flex flex-col gap-1.5">
                  {Array.from({ length: ghostCount }).map((_, i) => (
                    <GhostRow key={i} viewMode={viewMode} />
                  ))}
                </div>
              )}

              {instances.length === 0 && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
                  <p className="text-muted-foreground text-center text-xs font-thin">
                    No instances yet. Create one in the Instances tab.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * @param {{ viewMode: 'spaced' | 'cramped' }} props
 */
function SkeletonRow({ viewMode }) {
  const block = 'animate-pulse rounded-sm bg-(--surface-active)';

  if (viewMode === 'spaced') {
    return (
      <div className="rounded-md p-3">
        <div className={`h-2.5 w-12 ${block}`} />
        <div className={`mt-2 h-3.5 w-28 ${block}`} />
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-3 rounded-md p-2">
      <div className={`h-2.5 w-12 shrink-0 ${block}`} />
      <div className={`h-3.5 w-28 ${block}`} />
    </div>
  );
}

/**
 * Empty tile matching a real row's dimensions, with skeleton blocks inside.
 * Reads as "this row could exist", not "the list has ended".
 *
 * @param {{ viewMode: 'spaced' | 'cramped' }} props
 */
function GhostRow({ viewMode }) {
  const block = 'rounded-sm bg-(--surface-hover)';

  if (viewMode === 'spaced') {
    return (
      <div className="rounded-md p-3" aria-hidden="true">
        <div className={`h-2.5 w-12 ${block}`} />
        <div className={`mt-2 h-3.5 w-28 ${block}`} />
      </div>
    );
  }

  return (
    <div
      className="flex items-baseline gap-3 rounded-md p-2"
      aria-hidden="true"
    >
      <div className={`h-2.5 w-12 shrink-0 ${block}`} />
      <div className={`h-3.5 w-28 ${block}`} />
    </div>
  );
}

/**
 * @param {{ instance: McInstance, selected: boolean, viewMode: 'spaced' | 'cramped', onSelect: () => void }} props
 */
function InstanceRow({ instance, selected, viewMode, onSelect }) {
  const base = [
    'w-full rounded-md text-left transition-colors',
    selected ? 'bg-(--surface-active)' : 'hover:bg-(--surface-hover)',
  ].join(' ');

  const nameClass = [
    'text-sm font-extralight tracking-tight',
    selected ? 'text-(--saturn-fg-strong)' : 'text-foreground',
  ].join(' ');

  if (viewMode === 'spaced') {
    return (
      <button
        type="button"
        data-instance-row
        onClick={onSelect}
        className={`${base} p-3`}
      >
        <p className="text-muted-foreground text-xs font-thin tracking-[0.2em] uppercase">
          {instance.version}
        </p>
        <p className={`mt-1 line-clamp-1 ${nameClass}`}>{instance.name}</p>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-instance-row
      onClick={onSelect}
      className={`${base} flex items-baseline gap-3 p-2`}
    >
      <span className="text-muted-foreground shrink-0 text-xs font-thin tracking-[0.2em] uppercase">
        {instance.version}
      </span>
      <span className={`truncate ${nameClass}`}>{instance.name}</span>
    </button>
  );
}

/**
 * @param {{ mode: 'spaced' | 'cramped', onChange: (mode: 'spaced' | 'cramped') => void }} props
 */
function ViewToggle({ mode, onChange }) {
  const buttonClass = (active) =>
    [
      'flex h-7 w-7 items-center justify-center rounded-sm transition-colors',
      active
        ? 'bg-(--surface-active) text-(--saturn-fg-strong)'
        : 'text-muted-foreground hover:text-(--saturn-fg)',
    ].join(' ');

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-(--hairline) p-0.5">
      <button
        type="button"
        onClick={() => onChange('spaced')}
        aria-label="Spaced view"
        aria-pressed={mode === 'spaced'}
        className={buttonClass(mode === 'spaced')}
      >
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
          <rect
            x="1"
            y="2.25"
            width="10"
            height="1.5"
            rx="0.75"
            fill="currentColor"
          />
          <rect
            x="1"
            y="8.25"
            width="10"
            height="1.5"
            rx="0.75"
            fill="currentColor"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange('cramped')}
        aria-label="Cramped view"
        aria-pressed={mode === 'cramped'}
        className={buttonClass(mode === 'cramped')}
      >
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
          <rect
            x="1"
            y="1.5"
            width="10"
            height="1.5"
            rx="0.75"
            fill="currentColor"
          />
          <rect
            x="1"
            y="5.25"
            width="10"
            height="1.5"
            rx="0.75"
            fill="currentColor"
          />
          <rect
            x="1"
            y="9"
            width="10"
            height="1.5"
            rx="0.75"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
}
