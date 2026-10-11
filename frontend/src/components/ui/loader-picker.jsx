import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { AnimatePresence, motion } from 'motion/react';

import minecraftLogo from '@/assets/logos/minecraft.png';
import fabricLogo from '@/assets/logos/fabric.png';

const EASE = [0.22, 1, 0.38, 1];

export const LOADER_OPTIONS = [
  { value: 'vanilla', label: 'Vanilla', icon: minecraftLogo },
  { value: 'fabric', label: 'Fabric', icon: fabricLogo },
];

export function LoaderPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const chevronRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  const current =
    LOADER_OPTIONS.find((o) => o.value === value) ?? LOADER_OPTIONS[0];

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
      if (el instanceof Element && el.closest('[data-loader-dropdown]')) return;
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

  return (
    <div className="relative" ref={containerRef}>
      <div
        ref={triggerRef}
        className="bg-background flex h-11 min-w-28 items-stretch overflow-hidden rounded-md border border-(--hairline)"
      >
        <div className="flex flex-1 items-center gap-3 px-4 text-sm font-normal tracking-wide text-(--saturn-fg) transition-colors hover:bg-(--surface-hover) hover:text-(--saturn-fg-hover)">
          <img src={current.icon} alt="" className="size-5 shrink-0" />
          <span>{current.label}</span>
        </div>
        <button
          ref={chevronRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Select mod loader"
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
              data-loader-dropdown
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
              className="bg-background shadow-back/60 z-60 w-48 overflow-hidden rounded-md border border-(--hairline) shadow-lg"
            >
              {LOADER_OPTIONS.map((o) => {
                const selected = o.value === value;
                return (
                  <button
                    key={o.value}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={[
                      'flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm font-normal tracking-wide transition-colors',
                      selected
                        ? 'bg-(--surface-active) text-(--saturn-fg-strong)'
                        : 'text-(--saturn-fg-muted) hover:bg-(--surface-hover) hover:text-(--saturn-fg)',
                    ].join(' ')}
                  >
                    <img src={o.icon} alt="" className="size-5 shrink-0" />
                    <span>{o.label}</span>
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
