import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { GetNeoforgeVersions } from '../../../wailsjs/go/main/App';

/** @typedef {string} NeoforgeLoaderVersion */

const EASE = [0.22, 1, 0.38, 1];

export function NeoforgeVersionPicker({ gameVersion, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState(
    /**
     * @type {string[]}
     */
    ([])
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(
    /**
     * @type { string | null }
     */
    (null)
  );

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const chevronRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    let cancelled = false;
    setVersions([]);
    setLoading(true);
    setError(null);

    GetNeoforgeVersions(gameVersion)
      .then((hit) => {
        if (cancelled) return;
        setVersions(
          /**
           * @type {NeoforgeLoaderVersion[]}
           */
          (hit?.versions ?? [])
        );
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gameVersion]);

  const sortedVersions = [...versions].sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' })
  );

  useEffect(() => {
    if (loading) return;

    if (sortedVersions.length === 0) {
      if (value !== '') onChange('');
      return;
    }

    if (value && !sortedVersions.includes(value)) {
      onChange('');
      return;
    }

    if (!value) {
      onChange(sortedVersions[0]);
    }
  }, [value, loading, sortedVersions, onChange]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onDown = (e) => {
      const el = e.target;
      if (containerRef.current?.contains(el)) return;
      if (el instanceof Element && el.closest('[data-neoforge-dropdown]'))
        return;
      setOpen(false);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        setOpen(false);
        chevronRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);

    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const isUnsupported = !loading && !error && versions.length === 0;

  const triggerLabel = loading
    ? 'Loading...'
    : isUnsupported
      ? 'No version supported'
      : value || versions[0] || '—';

  return (
    <div ref={containerRef} className="relative">
      <div
        ref={triggerRef}
        className="bg-background flex h-11 min-w-28 items-stretch overflow-hidden rounded-md border border-(--hairline)"
      >
        <span className="flex flex-1 items-center px-4 text-sm font-normal tracking-wide text-(--saturn-fg) transition-colors hover:bg-(--surface-hover) hover:text-(--saturn-fg-hover)">
          {triggerLabel}
        </span>
        {!isUnsupported && (
          <button
            ref={chevronRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            disabled={loading}
            aria-label="Select NeoForge loader version"
            aria-expanded={open}
            className="flex items-center px-3.5 text-(--saturn-fg-muted) transition-colors outline-none hover:bg-(--surface-active) hover:text-(--saturn-fg-strong) focus-visible:bg-(--surface-active) focus-visible:text-(--saturn-fg-strong) disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronDown
              aria-hidden="true"
              className={`size-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              data-neoforge-dropdown
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: EASE }}
              style={{
                position: 'fixed',
                top: dropdownPos.top,
                right: dropdownPos.right,
              }}
              className="bg-background z-60 max-h-72 w-48 overflow-y-auto rounded-md border border-(--hairline) shadow-lg shadow-black/60"
            >
              {loading && (
                <div className="flex flex-col gap-1.5 p-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      className="h-8 animate-pulse rounded-sm bg-(--surface-active)"
                      key={i}
                    />
                  ))}
                </div>
              )}
              {error && (
                <p className="px-3.5 py-2.5 text-sm font-normal text-red-400">
                  {error}
                </p>
              )}
              {!loading && !error && versions.length === 0 && (
                <p className="text-muted-foreground px-3.5 py-2.5 text-sm font-normal">
                  No versions available.
                </p>
              )}

              {!loading &&
                !error &&
                sortedVersions.map((v) => {
                  const selected = v === value;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        onChange(v);
                        setOpen(false);
                      }}
                      className={[
                        'flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm font-normal tracking-wide transition-colors',
                        selected
                          ? 'bg-(--surface-active) text-(--saturn-fg-strong)'
                          : 'text-(--saturn-fg-muted) hover:bg-(--surface-hover) hover:text-(--saturn-fg)',
                      ].join(' ')}
                    >
                      <span>{v}</span>
                    </button>
                  );
                })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
