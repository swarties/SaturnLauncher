import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { AnimatePresence, motion } from 'motion/react';
import { GetVersions } from '../../../wailsjs/go/main/App';

/** @typedef {{id: string, type: string, url: string, sha1: string}} McVersion */

const EASE = [0.22, 1, 0.38, 1];

export function VersionPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState(/** @type {McVersion[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const chevronRef = useRef(null);
  const selectedRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    let cancelled = false;
    GetVersions()
      .then((vs) => {
        if (!cancelled) setVersions(/** @type {McVersion[]} */ (vs ?? []));
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      const el = /** @type {Node} */ (e.target);
      if (containerRef.current?.contains(el)) return;
      if (el instanceof Element && el.closest('[data-version-dropdown]'))
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

  useEffect(() => {
    if (open) selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <div
        ref={triggerRef}
        className="bg-background flex h-11 min-w-28 items-stretch overflow-hidden rounded-md border border-(--hairline)"
      >
        <span className="flex flex-1 items-center px-4 text-sm font-normal tracking-wide text-(--saturn-fg) transition-colors hover:bg-(--surface-hover) hover:text-(--saturn-fg-hover)">
          {value}
        </span>
        <button
          ref={chevronRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Select version"
          aria-expanded={open}
          className="flex items-center px-3.5 text-(--saturn-fg-muted) transition-colors outline-none hover:bg-(--surface-active) hover:text-(--saturn-fg-strong) focus-visible:bg-(--surface-active) focus-visible:text-(--saturn-fg-strong)"
        >
          <span
            aria-hidden="true"
            className={`text-sm transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </button>
      </div>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              data-version-dropdown
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: EASE }}
              style={
                /** @type {import('motion/react').MotionStyle} */ ({
                  position: 'fixed',
                  top: dropdownPos.top,
                  right: dropdownPos.right,
                })
              }
              className="bg-background z-60 max-h-72 w-48 overflow-y-auto rounded-md border border-(--hairline) shadow-lg shadow-black/60"
            >
              {loading && (
                <p className="px-3.5 py-2.5 text-sm font-normal text-(--saturn-fg-muted)">
                  Loading...
                </p>
              )}
              {error && (
                <p className="px-3.5 py-2.5 text-sm font-normal text-red-400">
                  {error}
                </p>
              )}

              {!loading &&
                !error &&
                /** @type {import('react').ReactNode} */ (
                  versions.map((v) => {
                    const selected = v.id === value;
                    return (
                      <button
                        key={v.id}
                        ref={selected ? selectedRef : undefined}
                        type="button"
                        onClick={() => {
                          onChange(v.id);
                          setOpen(false);
                        }}
                        className={[
                          'block w-full px-3.5 py-2.5 text-left text-sm font-normal tracking-wide transition-colors',
                          selected
                            ? 'bg-(--surface-active) text-(--saturn-fg-strong)'
                            : 'text-(--saturn-fg-muted) hover:bg-(--surface-hover) hover:text-(--saturn-fg)',
                        ].join(' ')}
                      >
                        {v.id}
                      </button>
                    );
                  })
                )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
