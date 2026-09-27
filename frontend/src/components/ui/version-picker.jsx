import { useEffect, useRef, useState } from 'react';
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
  const selectedRef = useRef(null);

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

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <div className="bg-background flex h-11 min-w-28 items-stretch overflow-hidden rounded-md border border-white/8">
        <span className="text-saturn-200 hover:text-saturn-50 flex flex-1 items-center px-4 text-sm font-normal tracking-wide transition-colors hover:bg-white/5">
          {value}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Select version"
          aria-expanded={open}
          className="text-saturn-400 hover:text-saturn-100 flex items-center px-3.5 transition-colors hover:bg-white/10"
        >
          <span
            aria-hidden="true"
            className={`text-sm transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="bg-background absolute top-full right-0 z-30 mt-2 max-h-72 w-48 overflow-y-auto rounded-md border border-white/8 shadow-lg shadow-black/60"
          >
            {loading && (
              <p className="text-saturn-400 px-3.5 py-2.5 text-sm font-normal">
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
                          ? 'text-saturn-100 bg-white/10'
                          : 'text-saturn-400 hover:text-saturn-200 hover:bg-white/5',
                      ].join(' ')}
                    >
                      {v.id}
                    </button>
                  );
                })
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
