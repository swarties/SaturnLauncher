import { useEffect, useState } from 'react';

import { createFileRoute, Link } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  LoaderCircle,
  PackagePlus,
  Plus,
  X,
} from 'lucide-react';

import { VersionPicker } from '@/components/ui/version-picker.jsx';
import { LoaderPicker } from '@/components/ui/loader-picker.jsx';
import { FabricVersionPicker } from '@/components/ui/fabric-version-picker.jsx';
import { toast } from '@/stores/toasts';
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogDescription,
  MorphingDialogTitle,
  MorphingDialogTrigger,
  useMorphingDialog,
} from '@/components/ui/morphing-dialog';

import {
  CreateInstance,
  DeleteInstance,
  InstallFabric,
  InstallMrpack,
  ListInstances,
} from '../../../wailsjs/go/main/App';
import { onBackendEvent } from '@/lib/backend.js';

export const Route = createFileRoute('/_app/instances')({
  component: InstancesPage,
});

/** @typedef {{ name: string, version: string, uuid: string, timecreated: string, minram: number, maxram: number, description?: string, fabricVersion?: string }} McInstance */

function InstancesPage() {
  const [instances, setInstances] = useState(/** @type {McInstance[]} */ ([]));
  const [creating, setCreating] = useState(false);
  const [installingPack, setInstallingPack] = useState(false);
  const [packSuccess, setPackSuccess] = useState(false);
  const navigate = Route.useNavigate();

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      ListInstances()
        .then((list) => {
          if (cancelled) return;
          setInstances(/** @type {McInstance[]} */ (list ?? []));
        })
        .catch((e) => {
          if (cancelled) return;
          toast.error(e?.message ?? String(e));
        });
    };

    load();
    const off = onBackendEvent('instance:changed', load);

    return () => {
      cancelled = true;
      if (typeof off === 'function') off();
    };
  }, []);

  const handleInstallModpack = async (path = '') => {
    if (installingPack) return;
    setInstallingPack(true);

    try {
      const newUuid = await InstallMrpack(path);
      if (newUuid) {
        setInstallingPack(false);
        setPackSuccess(true);
        setTimeout(() => {
          setCreating(false);
          void navigate({ to: '/instances/$uuid', params: { uuid: newUuid } });
        }, 2500);
      } else {
        setInstallingPack(false);
      }
    } catch (e) {
      toast.error(e?.message ?? String(e));
      setInstallingPack(false);
    }
  };

  const handleDelete = async (inst) => {
    await DeleteInstance(inst.uuid);
  };

  const isEmpty = instances.length === 0;

  return (
    <div className="flex h-full w-full flex-col p-6">
      <MorphingDialog open={creating} onOpenChange={setCreating}>
        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-8">
            <p className="text-muted-foreground text-5xl font-extralight tracking-tight">
              No instances yet
            </p>
            <MorphingDialogTrigger className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 group flex h-11 items-center gap-2 rounded-lg border px-6 font-thin transition-colors">
              New Instance
              <Plus aria-hidden="true" className="text-saturn-300 size-5" />
            </MorphingDialogTrigger>
          </div>
        ) : (
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
                <Plus aria-hidden="true" className="text-saturn-300 size-5" />
              </MorphingDialogTrigger>
            </div>

            <motion.div
              layout
              className="grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-5"
            >
              <AnimatePresence>
                {instances.map((inst, i) => (
                  <InstanceCard
                    key={inst.uuid}
                    instance={inst}
                    onDelete={handleDelete}
                    index={i}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}

        <MorphingDialogContainer>
          <MorphingDialogContent className="bg-background relative w-full max-w-4xl rounded-md border-2 border-(--surface-border) p-8">
            <MorphingDialogTitle className="text-muted-foreground text-sm font-normal tracking-[0.2em] uppercase">
              New Instance
            </MorphingDialogTitle>
            <MorphingDialogDescription className="text-muted-foreground mt-1 mb-6 text-sm font-normal">
              Create a vanilla/fabric instance, or drop a Modrinth Modpack to
              install it instantly.
            </MorphingDialogDescription>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_1.2fr]">
              <div className="flex flex-col">
                <div
                  onClick={() => handleInstallModpack('')}
                  className={`group hover:border-saturn-500/50 relative flex h-full min-h-72 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-(--surface-border) transition-colors hover:bg-(--surface-hover) ${
                    installingPack ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  <AnimatePresence>
                    {packSuccess ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, type: 'spring' }}
                        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 text-center"
                      >
                        <div className="flex h-20 items-center justify-center">
                          <Check
                            className="size-12 text-white"
                            strokeWidth={2.5}
                          />
                        </div>
                        <div className="flex h-14 items-center justify-center">
                          <p className="text-foreground text-lg font-thin tracking-wide">
                            We&#39;re redirecting you, hang tight
                            <AnimatedDots />
                          </p>
                        </div>
                      </motion.div>
                    ) : installingPack ? (
                      <motion.div
                        key="installing"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4"
                      >
                        <div className="flex h-20 items-center justify-center">
                          <LoaderCircle className="text-saturn-400 size-12 animate-spin" />
                        </div>
                        <div className="flex h-14 items-center justify-center">
                          <p className="text-foreground text-lg font-thin tracking-wide">
                            Installing Modpack...
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4"
                      >
                        <div className="flex h-20 items-center justify-center">
                          <div className="group-hover:border-saturn-500/50 group-hover:bg-saturn-900/40 group-hover:text-saturn-300 flex size-20 items-center justify-center rounded-xl border border-(--surface-border) bg-(--chip-bg) text-(--chip-fg) shadow-lg shadow-black/20 transition-all duration-300 group-hover:-translate-y-1">
                            <PackagePlus className="size-8" strokeWidth={1.5} />
                          </div>
                        </div>
                        <div className="flex h-14 items-center justify-center">
                          <p className="text-foreground text-center text-lg font-thin tracking-wide">
                            Click or <s className="opacity-50">drag in</s>
                            <br />a .mrpack file
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div
                className={`flex flex-col transition-opacity duration-300 ${installingPack ? 'pointer-events-none opacity-20' : ''}`}
              >
                <CreateInstanceForm />
              </div>
            </div>
          </MorphingDialogContent>
        </MorphingDialogContainer>
      </MorphingDialog>
    </div>
  );
}

function InstanceCard({ instance, onDelete, index }) {
  return (
    <MorphingDialog>
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{
          duration: 0.4,
          ease: [0.22, 1, 0.38, 1],
          delay: index * 0.05,
        }}
        className="group relative flex min-h-48 flex-col rounded-md border-2 border-(--surface-border) transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover)"
      >
        <MorphingDialogTrigger
          aria-label={`Delete ${instance.name}`}
          className="text-muted-foreground absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-sm opacity-40 transition-[opacity,color] group-hover:opacity-100 hover:text-red-400"
        >
          <X className="size-5" />
        </MorphingDialogTrigger>

        <Link
          to="/instances/$uuid"
          params={{ uuid: instance.uuid }}
          draggable={false}
          className="flex flex-1 cursor-pointer flex-col rounded-md p-5"
        >
          <p className="text-muted-foreground text-xs font-thin tracking-[0.2em] uppercase">
            {instance.version}
          </p>
          <p className="text-foreground mt-1 line-clamp-2 text-xl font-extralight tracking-tight">
            {instance.name}
          </p>
          <p className="text-muted-foreground mt-1 text-xs font-thin">
            {instance.fabricVersion
              ? `Fabric · ${instance.fabricVersion
                  .replace('fabric-loader-', '')
                  .replace(`-${instance.version}`, '')}`
              : 'Vanilla'}
          </p>
          <div className="mt-auto flex items-center justify-between pt-6">
            <span className="text-muted-foreground text-xs font-thin">
              {formatCreated(instance.timecreated)}
            </span>
            <ArrowRight
              aria-hidden="true"
              className="text-saturn-400 size-4 transition-transform group-hover:translate-x-0.5"
            />
          </div>
        </Link>
      </motion.div>

      <MorphingDialogContainer>
        <MorphingDialogContent className="bg-background relative w-full max-w-sm rounded-md border-2 border-(--surface-border) p-6">
          <DeleteConfirmContent instance={instance} onDelete={onDelete} />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}

function DeleteConfirmContent({ instance, onDelete }) {
  const { setIsOpen } = useMorphingDialog();
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onDelete(instance);
      setIsOpen(false);
    } catch (e) {
      toast.error(e?.message ?? String(e));
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

function AnimatedDots() {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '.' : d + ','));
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return <span className="inline-block w-4 text-left">{dots}</span>;
}

function CreateInstanceForm() {
  const { setIsOpen, setPreventClose } = useMorphingDialog();
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.14');
  const [loader, setLoader] = useState('vanilla');
  const [fabricVersion, setFabricVersion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [partialUuid, setPartialUuid] = useState(
    /** @type {string | null} */ (null)
  );
  useEffect(() => {
    if (loader !== 'fabric') setFabricVersion('');
  }, [loader]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!partialUuid && !name.trim()) return;
    if (!partialUuid && loader === 'fabric' && !fabricVersion) return;

    setSubmitting(true);
    setPreventClose(true);

    let uuid = partialUuid;

    try {
      if (!uuid) {
        setPhase('creating');
        const inst = await CreateInstance(name.trim(), version);
        uuid = inst.uuid;
      }

      if (loader === 'fabric') {
        setPhase(uuid === partialUuid ? 'retrying' : 'installing');
        await InstallFabric(uuid, fabricVersion);
      }

      setIsOpen(false);
    } catch (e) {
      toast.error(e?.message ?? String(e));
      setPartialUuid(uuid);
      setSubmitting(false);
      setPhase('idle');
      setPreventClose(false);
    }
  };

  const buttonLabel = (() => {
    if (submitting) {
      if (phase === 'creating') return 'Creating...';
      if (phase === 'installing') return 'Installing Fabric...';
      if (phase === 'retrying') return 'Retrying...';
      return 'Working...';
    }
    if (partialUuid) return 'Retry Fabric Install';
    return 'Create';
  })();

  const canSubmit =
    !submitting &&
    (Boolean(partialUuid) ||
      (name.trim() && (loader !== 'fabric' || Boolean(fabricVersion))));

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-thin tracking-[0.2em] uppercase">
            Name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              if (e.nativeEvent.isComposing) return;
              e.preventDefault();
              void handleSubmit();
            }}
            placeholder="My Instance"
            className="bg-background text-foreground placeholder:text-muted-foreground/50 h-11 rounded-md border border-(--hairline) px-4 text-sm font-normal transition-colors outline-none focus:border-(--chip-border-hover)"
          />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-thin tracking-[0.2em] uppercase">
            Version
          </span>
          <VersionPicker value={version} onChange={setVersion} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-thin tracking-[0.2em] uppercase">
            Loader
          </span>
          <LoaderPicker value={loader} onChange={setLoader} />
        </div>
        <AnimatePresence initial={false}>
          {loader === 'fabric' && (
            <motion.div
              className="flex flex-col gap-2"
              key="fabric-version"
              initial={{ opacity: 0, height: 0, marginTop: -16 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: -16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.38, 1] }}
            >
              <span className="text-muted-foreground text-xs font-thin tracking-[0.2em] uppercase">
                Fabric Version
              </span>
              <FabricVersionPicker
                gameVersion={version}
                value={fabricVersion}
                onChange={setFabricVersion}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-auto flex justify-end gap-3 pt-6">
        <MorphingDialogClose
          disabled={submitting}
          className="text-muted-foreground h-10 rounded-md border-2 border-(--surface-border) px-4 text-sm font-thin transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover)"
        >
          {partialUuid ? 'Close' : 'Cancel'}
        </MorphingDialogClose>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 flex h-10 w-36 items-center justify-center rounded-md border text-sm font-thin transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
