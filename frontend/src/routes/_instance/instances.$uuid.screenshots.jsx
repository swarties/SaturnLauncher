import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createFileRoute } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Camera,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Loader2,
  Maximize2,
  Trash2,
  X,
} from 'lucide-react';

import { onBackendEvent } from '@/lib/backend';
import { toast } from '@/stores/toasts';
import { cn } from '@/lib/utils';
import {
  MorphingDialog,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogDescription,
  MorphingDialogTitle,
  MorphingDialogTrigger,
  useMorphingDialog,
} from '@/components/ui/morphing-dialog';
import {
  DeleteScreenshot,
  GetScreenshot,
  ListScreenshots,
  OpenContentFolder,
} from '../../../wailsjs/go/main/App';

export const Route = createFileRoute('/_instance/instances/$uuid/screenshots')({
  component: ScreenshotsTab,
});

const EASE = [0.22, 1, 0.38, 1];

const clearTooltip = () => {
  document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
};

function ScreenshotsTab() {
  const { uuid } = Route.useParams();
  const [files, setFiles] = useState([]);
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    let cancelled = false;

    ListScreenshots(uuid)
      .then((list) => {
        if (cancelled) return;
        setFiles(list || []);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e?.message ?? String(e);
        setError(msg);
        toast.error(`Failed to load screenshots: ${msg}`);
        setLoading(false);
      });

    const off = onBackendEvent('screenshot:deleted', (filename) => {
      setFiles((prev) => prev.filter((f) => f !== filename));
      setImages((prev) => {
        const next = { ...prev };
        delete next[filename];
        return next;
      });
    });

    return () => {
      cancelled = true;
      if (typeof off === 'function') off();
    };
  }, [uuid]);

  const handleImageLoaded = (filename, base64) => {
    setImages((prev) => ({ ...prev, [filename]: base64 }));
  };

  const handleDelete = async (e, filename) => {
    e.stopPropagation();

    setFiles((prev) => prev.filter((f) => f !== filename));
    setImages((prev) => {
      const next = { ...prev };
      delete next[filename];
      return next;
    });

    try {
      await DeleteScreenshot(uuid, filename);
      toast.success('Screenshot deleted');
    } catch (e) {
      toast.error(e?.message ?? 'Failed to delete screenshot');
      setFiles((prev) =>
        [...prev, filename].sort((a, b) => b.localeCompare(a))
      );
    }
  };

  const sortedFiles = [...files].sort((a, b) =>
    sortAsc ? a.localeCompare(b) : b.localeCompare(a)
  );

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-center text-sm font-thin text-red-400">
          Failed to load screenshots: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-6">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div>
          <h1 className="text-foreground text-3xl font-normal tracking-tight">
            Screenshots
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-thin">
            {loading
              ? 'Loading...'
              : `${files.length} screenshot${files.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortAsc((prev) => !prev)}
            data-tooltip={sortAsc ? 'Oldest first' : 'Newest First'}
            className="text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md border border-(--hairline) transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) hover:text-(--saturn-fg-hover)"
          >
            {sortAsc ? (
              <ArrowUpNarrowWide className="size-4" aria-hidden="true" />
            ) : (
              <ArrowDownNarrowWide className="size-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() =>
              OpenContentFolder(uuid, 'screenshots').catch((err) =>
                toast.error(err?.message ?? 'Failed to open folder')
              )
            }
            data-tooltip="Open screenshots folder"
            className="text-muted-foreground flex h-10 shrink-0 items-center gap-2 rounded-md border border-(--hairline) px-4 transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) hover:text-(--saturn-fg-hover)"
          >
            <FolderOpen className="size-4" aria-hidden="true" />
            <span className="text-sm font-thin">Open Folder</span>
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 scrollbar-gutter-stable overflow-y-auto overscroll-contain pb-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="text-saturn-500 size-8 animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="text-muted-foreground/50 flex size-20 items-center justify-center rounded-full bg-(--chip-bg)">
              <Camera className="size-10" />
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-2xl font-thin">
                No screenshots yet
              </p>
              <p className="text-muted-foreground/70 mt-1 text-sm font-thin">
                Take a screenshot in-game and watch it appear here!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(22rem,1fr))] gap-5">
            <AnimatePresence mode="popLayout">
              {sortedFiles.map((filename, i) => (
                <ScreenshotItem
                  key={filename}
                  uuid={uuid}
                  filename={filename}
                  base64={images[filename]}
                  index={i}
                  onLoad={handleImageLoaded}
                  onOpen={() => setSelectedImage(filename)}
                  onDelete={(e) => handleDelete(e, filename)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedImage && (
          <ScreenshotLightbox
            filename={selectedImage}
            base64={images[selectedImage]}
            files={sortedFiles}
            onClose={() => setSelectedImage(null)}
            onChange={(newFilename) => setSelectedImage(newFilename)}
            onDelete={(e) => {
              void handleDelete(e, selectedImage);
              setSelectedImage(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfirmDeleteDialog({ filename, onConfirm, triggerClassName }) {
  return (
    <MorphingDialog>
      <div onClick={(e) => e.stopPropagation()}>
        <MorphingDialogTrigger
          className={cn(
            'flex items-center justify-center rounded-full transition-colors',
            triggerClassName
          )}
          onClick={clearTooltip}
          data-tooltip="Delete"
        >
          <Trash2 className="size-5" />
        </MorphingDialogTrigger>
      </div>

      <MorphingDialogContainer>
        <MorphingDialogContent className="bg-background relative w-full max-w-sm rounded-md border-2 border-(--surface-border) p-6">
          <ConfirmDeleteContent filename={filename} onConfirm={onConfirm} />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}

function ConfirmDeleteContent({ filename, onConfirm }) {
  const { setIsOpen } = useMorphingDialog();
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
      setIsOpen(false);
    } catch (e) {
      toast.error(e?.message ?? 'Failed to delete screenshot');
      setBusy(false);
    }
  };

  return (
    <>
      <MorphingDialogTitle className="text-muted-foreground text-sm font-normal tracking-[0.2em] uppercase">
        Delete Screenshot
      </MorphingDialogTitle>
      <MorphingDialogDescription className="text-muted-foreground mt-2 text-sm font-normal">
        Are you really sure you want to delete this screenshot? It'll be gone
        for good (a long time)
        <span className="text-foreground mt-2 block truncate font-mono text-xs">
          {filename}
        </span>
      </MorphingDialogDescription>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          disabled={busy}
          className="text-muted-foreground h-10 rounded-md border-2 border-(--surface-border) px-4 text-sm font-thin transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) disabled:pointer-events-none disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          className="h-10 rounded-md border border-red-900/60 bg-red-950/40 px-6 text-sm font-thin text-red-200 transition-colors hover:border-red-700/60 hover:bg-red-950/60 hover:text-red-100 disabled:pointer-events-none disabled:opacity-40"
        >
          {busy ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </>
  );
}

function ScreenshotItem({
  uuid,
  filename,
  base64,
  index,
  onLoad,
  onOpen,
  onDelete,
}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || base64 || fetchError) return;

    let cancelled = false;
    GetScreenshot(uuid, filename)
      .then((b64) => {
        if (!cancelled) onLoad(filename, b64);
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError(true);
          toast.error(`Failed to load image: ${filename}`);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isVisible, base64, fetchError, filename, uuid, onLoad]);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: EASE }}
      onClick={() => {
        if (base64) onOpen();
      }}
      className="group relative aspect-video cursor-pointer overflow-hidden rounded-md border border-(--hairline) bg-(--surface-active)"
    >
      {base64 ? (
        <img
          src={`data:image/png;base64,${base64}`}
          alt={filename}
          className="h-full w-full transform-gpu object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : fetchError ? (
        <div className="flex h-full items-center justify-center p-4">
          <p className="text-center text-xs font-thin text-red-400">
            Failed to load
          </p>
        </div>
      ) : (
        <div className="flex h-full w-full animate-pulse items-center justify-center">
          <Loader2 className="size-5 animate-spin text-(--saturn-fg-muted)" />
        </div>
      )}

      {base64 && (
        <div className="absolute -inset-px flex items-center justify-center gap-3 bg-black/60 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            data-tooltip="View full size"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <Maximize2 className="size-5" />
          </button>
          <ConfirmDeleteDialog
            filename={filename}
            onConfirm={() => onDelete({ stopPropagation: () => {} })}
            triggerClassName="size-12 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
          />
        </div>
      )}
    </motion.div>
  );
}

function ScreenshotLightbox({
  filename,
  base64,
  files,
  onClose,
  onChange,
  onDelete,
}) {
  const currentIndex = files.indexOf(filename);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  const handlePrev = (e) => {
    e?.stopPropagation();
    clearTooltip();
    if (hasPrev) onChange(files[currentIndex - 1]);
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    clearTooltip();
    if (hasNext) onChange(files[currentIndex + 1]);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, currentIndex, hasPrev, hasNext]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-(--backdrop) p-6 backdrop-blur-md"
    >
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: EASE }}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative flex max-h-full max-w-6xl flex-col justify-center overflow-hidden rounded-md border-2 border-(--surface-border) bg-black shadow-2xl"
      >
        <div className="grid max-h-[85vh] w-full max-w-[90vw] place-items-center overflow-hidden">
          <AnimatePresence initial={false}>
            {base64 ? (
              <motion.img
                key={filename}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                src={`data:image/png;base64,${base64}`}
                alt={filename}
                className="col-start-1 row-start-1 block h-auto max-h-[85vh] w-auto max-w-full object-contain"
              />
            ) : (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="col-start-1 row-start-1 flex h-[50vh] w-[50vw] items-center justify-center"
              >
                <Loader2 className="size-8 animate-spin text-(--saturn-fg-muted)" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Top Right Controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className="rounded bg-black/50 px-3 py-1.5 text-xs font-thin text-white backdrop-blur-md">
            {filename}
          </span>
          <ConfirmDeleteDialog
            filename={filename}
            onConfirm={() => onDelete({ stopPropagation: () => {} })}
            triggerClassName="size-10 bg-black/50 text-red-400 backdrop-blur-md hover:bg-black/70 hover:text-red-300"
          />
          <button
            type="button"
            onClick={() => {
              clearTooltip();
              onClose();
            }}
            data-tooltip="Close"
            className="flex size-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Left Arrow */}
        {hasPrev && (
          <button
            onClick={handlePrev}
            data-tooltip="Previous"
            className="absolute top-1/2 left-4 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}

        {/* Right Arrow */}
        {hasNext && (
          <button
            onClick={handleNext}
            data-tooltip="Next"
            className="absolute top-1/2 right-4 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70"
          >
            <ChevronRight className="size-6" />
          </button>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}
