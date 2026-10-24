import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Info, TriangleAlert, X } from 'lucide-react';
import { removeToast, useToasts } from '@/stores/toasts';

const ICONS = {
  success: Check,
  error: TriangleAlert,
  info: Info,
};

const STYLES = {
  success:
    'bg-card border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  error: 'bg-card border-(--danger-border) text-(--danger-fg)',
  info: 'bg-card border-(--chip-border) text-(--chip-fg)',
};

export function ToastContainer() {
  const { toasts } = useToasts();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="pointer-events-none fixed right-6 bottom-6 z-[100] flex w-80 flex-col gap-3">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

function ToastItem({ toast }) {
  const Icon = ICONS[toast.type] || Info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.38, 1] }}
      onClick={() => toast.dismissible && removeToast(toast.id)}
      className={`group pointer-events-auto flex cursor-pointer items-start gap-3 rounded-md border-2 p-4 shadow-lg transition-colors hover:border-(--surface-border-hover) ${STYLES[toast.type] || STYLES.info}`}
    >
      <Icon className="mt-0.5 size-5 shrink-0" />
      <p className="flex-1 text-sm font-normal wrap-break-word">
        {toast.message}
      </p>
      {toast.dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={(e) => {
            e.stopPropagation();
            removeToast(toast.id);
          }}
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-60 hover:opacity-100!"
        >
          <X className="size-4" />
        </button>
      )}
    </motion.div>
  );
}
