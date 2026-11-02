import { useEffect, useRef, useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import { useNavigate } from '@tanstack/react-router';
import { Settings } from 'lucide-react';

import { ListInstances } from '../../../wailsjs/go/main/App';
import { onBackendEvent } from '@/lib/backend';
import { useAuth } from '@/stores/auth';
import { updateConfig, useConfig } from '@/stores/config';

import { formatPlaytime } from '@/lib/utils';

/** @typedef {{ name: string, version: string, uuid: string, timecreated: string, minram: number, maxram: number, playtimeSeconds?: number}} McInstance */

const VIEW_MODES = ['spaced', 'cramped'];
const DEFAULT_VIEW_MODE = 'spaced';

/**
 * @param {{ onSelectionChange: (instance: McInstance | null) => void }} props
 */
export function InstanceSelector({ onSelectionChange }) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { config } = useConfig();
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

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!scopeKey) return;

    if (!hasInitializedRef.current && Object.keys(config).length > 0) {
      const storedUuid = config[`activeInstance_${scopeKey}`];
      if (storedUuid) setSelectedUuid(storedUuid);

      const storedView = config[`instanceView_${scopeKey}`];
      if (VIEW_MODES.includes(storedView)) setViewMode(storedView);

      hasInitializedRef.current = true;
    }
  }, [scopeKey, config]);

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

    if (!scopeKey || !selectedId) return;
    void updateConfig(`activeInstance_${scopeKey}`, selectedId);
  }, [selectedUuid, instances, scopeKey]);

  useEffect(() => {
    if (!scopeKey) return;
    void updateConfig(`instanceView_${scopeKey}`, viewMode);
  }, [viewMode, scopeKey]);

  const countLabel = loading
    ? 'Loading...'
    : `${instances.length} ${instances.length === 1 ? 'instance' : 'instances'}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden [contain:size]">
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
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {error && (
            <div className="flex h-full items-center justify-center p-4">
              <p className="text-center text-xs font-thin text-red-400">
                {error}
              </p>
            </div>
          )}

          {!error && loading && (
            <div className="flex h-full items-center justify-center p-4">
              <p className="text-muted-foreground text-center text-xs font-thin">
                Loading...
              </p>
            </div>
          )}

          {!error && !loading && (
            <div className="flex min-h-full flex-col gap-1.5 p-2">
              <LayoutGroup>
                <div className="flex flex-col gap-1.5">
                  {instances.map((inst) => (
                    <InstanceRow
                      key={inst.uuid}
                      instance={inst}
                      selected={inst.uuid === selectedUuid}
                      viewMode={viewMode}
                      onSelect={() => setSelectedUuid(inst.uuid)}
                      onOpenMenu={() =>
                        navigate({
                          to: '/instances/$uuid',
                          params: { uuid: inst.uuid },
                          search: { from: 'home' },
                        })
                      }
                    />
                  ))}
                </div>
              </LayoutGroup>

              {instances.length === 0 && (
                <div className="flex flex-1 items-center justify-center p-4">
                  <p className="text-muted-foreground text-center text-xs font-thin">
                    No instances yet. Create one in the Instances tab.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const LAYOUT_TRANSITION = { type: 'spring', stiffness: 500, damping: 40 };

/**
 * @param {{ instance: McInstance, selected: boolean, viewMode: 'spaced' | 'cramped', onSelect: () => void, onOpenMenu: () => void }} props
 */
function InstanceRow({ instance, selected, viewMode, onSelect, onOpenMenu }) {
  const base = [
    'w-full min-w-0 max-w-full overflow-hidden rounded-md text-left transition-colors cursor-pointer group',
    selected ? 'bg-(--surface-active)' : 'hover:bg-(--surface-hover)',
  ].join(' ');

  const modeClass =
    viewMode === 'spaced'
      ? 'flex flex-col gap-1 p-3'
      : 'flex items-baseline gap-3 p-2';

  const nameClass = [
    'text-sm font-extralight tracking-tight truncate',
    selected ? 'text-(--saturn-fg-strong)' : 'text-foreground',
  ].join(' ');

  return (
    <motion.div
      role="button"
      tabIndex={0}
      layout
      transition={LAYOUT_TRANSITION}
      data-instance-row
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`${base} ${modeClass}`}
    >
      <motion.span
        layout="position"
        transition={LAYOUT_TRANSITION}
        className="text-muted-foreground shrink-0 text-xs font-thin tracking-[0.2em] uppercase"
      >
        {instance.version}
      </motion.span>
      <motion.div
        layout="position"
        transition={LAYOUT_TRANSITION}
        className="flex w-full min-w-0 items-baseline justify-between gap-3"
      >
        <motion.span
          className={nameClass}
          layout="position"
          transition={LAYOUT_TRANSITION}
        >
          {instance.name}
        </motion.span>
        <div className="flex shrink-0 items-center gap-2">
          <motion.span
            layout="position"
            transition={LAYOUT_TRANSITION}
            className="text-muted-foreground text-xs font-thin"
          >
            {formatPlaytime(instance.playtimeSeconds ?? 0)}
          </motion.span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMenu();
            }}
            className="text-muted-foreground/60 flex size-8 shrink-0 items-center justify-center rounded-md border border-(--hairline) transition-colors hover:bg-(--surface-active) hover:text-(--saturn-fg-strong)"
            data-tooltip="Go to instance menu"
          >
            <Settings className="size-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
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
