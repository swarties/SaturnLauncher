import { useState, useEffect } from 'react';

import { createFileRoute } from '@tanstack/react-router';
import { motion } from 'motion/react';

import { VersionPicker } from '@/components/ui/version-picker.jsx';
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogDescription,
  MorphingDialogClose,
  useMorphingDialog,
} from '@/components/ui/morphing-dialog';

import {
  CreateInstance,
  DeleteInstance,
  ListInstances,
} from '../../../wailsjs/go/main/App';
import { onBackendEvent } from '@/lib/backend.js';

export const Route = createFileRoute('/_app/instances')({
  component: InstancesPage,
});

/** @typedef {{ name: string, version: string, uuid: string, timecreated: string, minram: number, maxram: number }} McInstance */

function InstancesPage() {
  const [instances, setInstances] = useState(/** @type {McInstance[]} */ ([]));
  const [loadError, setLoadError] = useState(
    /** @type {string | null} */ (null)
  );
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      ListInstances()
        .then((list) => {
          if (cancelled) return;
          setInstances(/** @type {McInstance[]} */ (list ?? []));
          setLoadError(null);
        })
        .catch((e) => {
          if (cancelled) return;
          setLoadError(e?.message ?? String(e));
        });
    };

    load();
    const off = onBackendEvent('instance:changed', load);

    return () => {
      cancelled = true;
      if (typeof off === 'function') off();
    };
  }, []);

  const handleDelete = async (inst) => {
    await DeleteInstance(inst.uuid);
  };

  const isEmpty = instances.length === 0;

  return (
    <div className="flex h-full w-full flex-col p-6">
      <MorphingDialog open={creating} onOpenChange={setCreating}>
        {loadError && (
          <p className="mb-4 text-xs font-thin text-red-400">
            Failed to load instances: {loadError}
          </p>
        )}
        {isEmpty ? (
          /* Empty state — everything centered */
          <div className="flex flex-1 flex-col items-center justify-center gap-8">
            <p className="text-muted-foreground text-5xl font-extralight tracking-tight">
              No instances yet
            </p>
            <MorphingDialogTrigger className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 group flex h-11 items-center gap-2 rounded-lg border px-6 font-thin transition-colors">
              New Instance
              <span
                aria-hidden="true"
                className="text-saturn-300 text-lg leading-none"
              >
                +
              </span>
            </MorphingDialogTrigger>
          </div>
        ) : (
          /* Populated state — header + grid */
          <>
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-foreground text-3xl font-normal tracking-tight">
                  Instances
                </h1>
                <p className="text-muted-foreground mt-1 text-sm font-thin">
                  {instances.length}{' '}
                  {instances.length === 1 ? 'instance' : 'instances'}
                </p>
              </div>
              <MorphingDialogTrigger className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 group flex h-11 items-center gap-2 rounded-lg border px-6 font-thin transition-colors">
                New Instance
                <span
                  aria-hidden="true"
                  className="text-saturn-300 text-lg leading-none"
                >
                  +
                </span>
              </MorphingDialogTrigger>
            </div>

            <div className="grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-5">
              {instances.map((inst) => (
                <InstanceCard
                  key={inst.uuid}
                  instance={inst}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </>
        )}

        {/* Dialog — same content for both states */}
        <MorphingDialogContainer>
          <MorphingDialogContent className="border-saturn-950 bg-background relative w-full max-w-md rounded-md border-2 p-6">
            <MorphingDialogTitle className="text-muted-foreground text-sm font-normal tracking-[0.2em] uppercase">
              New Instance
            </MorphingDialogTitle>
            <MorphingDialogDescription className="text-muted-foreground mt-1 text-sm font-normal">
              Name your instance and pick a version.
            </MorphingDialogDescription>

            <CreateInstanceForm />
          </MorphingDialogContent>
        </MorphingDialogContainer>
      </MorphingDialog>
    </div>
  );
}

/**
 * @param {{ instance: McInstance, onDelete: (inst: McInstance) => Promise<void> }} props
 */
function InstanceCard({ instance, onDelete }) {
  return (
    <MorphingDialog>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.38, 1] }}
        className="border-saturn-950 hover:border-saturn-700/60 hover:bg-saturn-900/20 group relative flex min-h-48 cursor-pointer flex-col rounded-md border-2 p-5 transition-colors"
      >
        <MorphingDialogTrigger
          aria-label={`Delete ${instance.name}`}
          className="text-muted-foreground absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-sm text-2xl leading-none opacity-40 transition-[opacity,color] group-hover:opacity-100 hover:text-red-400"
        >
          ×
        </MorphingDialogTrigger>
        <p className="text-muted-foreground text-xs font-thin tracking-[0.2em] uppercase">
          {instance.version}
        </p>
        <p className="text-foreground mt-1 line-clamp-2 text-xl font-extralight tracking-tight">
          {instance.name}
        </p>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-thin">
            {formatCreated(instance.timecreated)}
          </span>
          <span
            aria-hidden="true"
            className="text-saturn-400 text-lg transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </div>
      </motion.div>

      <MorphingDialogContainer>
        <MorphingDialogContent className="border-saturn-950 bg-background relative w-full max-w-sm rounded-md border-2 p-6">
          <DeleteConfirmContent instance={instance} onDelete={onDelete} />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}

/**
 * @param {{ instances: McInstance, onDelete: (inst: McInstance) => Promise<void>}} props
 */

function DeleteConfirmContent({ instance, onDelete }) {
  const { setIsOpen } = useMorphingDialog();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type { string | null }*/ (null));

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete(instance);
      setIsOpen(false);
    } catch (e) {
      setError(e?.message ?? String(e));
    }
  };

  return (
    <>
      <MorphingDialogTitle className="text-muted-foreground text-sm font-normal tracking-[0.2em] uppercase">
        Delete Instance
      </MorphingDialogTitle>
      <MorphingDialogDescription className="text-muted-foreground mt-2 text-sm font-normal">
        Are you sure you want to delete{' '}
        <span className="text-foreground">{instance.name}</span>? This cannot be
        undone.
      </MorphingDialogDescription>
      {error && <p className="mt-3 text-xs font-thin text-red-400">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          disabled={busy}
          className="border-saturn-950 hover:border-saturn-700/60 hover:bg-saturn-900/20 text-muted-foreground h-10 rounded-md border-2 px-4 text-sm font-thin transition-colors disabled:pointer-events-none disabled:opacity-40"
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

/**
 * @param {string} iso
 */

function formatCreated(iso) {
  if (!iso) return '—';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '—';
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function CreateInstanceForm() {
  const { setIsOpen } = useMorphingDialog();
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.14');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(/** @type { string | null } */ (null));

  const handleCreate = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await CreateInstance(name.trim(), version);
      setIsOpen(false);
    } catch (e) {
      setError(e?.message ?? String(e));
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-thin tracking-[0.2em] uppercase">
            Name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Instance"
            className="bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-saturn-500/60 h-11 rounded-md border border-white/8 px-4 text-sm font-normal transition-colors outline-none"
          />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-thin tracking-[0.2em] uppercase">
            Version
          </span>
          <VersionPicker value={version} onChange={setVersion} />
        </div>
        {error && <p className="text-xs font-thin text-red-400">{error}</p>}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <MorphingDialogClose className="border-saturn-950 hover:border-saturn-700/60 hover:bg-saturn-900/20 text-muted-foreground h-10 rounded-md border-2 px-4 text-sm font-thin transition-colors">
          Cancel
        </MorphingDialogClose>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim() || submitting}
          className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 h-10 rounded-md border px-6 text-sm font-thin transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          {submitting ? 'Creating...' : 'Create'}
        </button>
      </div>
    </>
  );
}
