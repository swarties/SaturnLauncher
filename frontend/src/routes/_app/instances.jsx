import { useState } from 'react';

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
} from '@/components/ui/morphing-dialog';

export const Route = createFileRoute('/_app/instances')({
  component: InstancesPage,
});

/** @typedef {{ id: string, name: string, version: string, lastPlayed?: string }} Instance */

function InstancesPage() {
  /** @type {[Instance[], Function]} */
  const [instances] = useState([
    // Uncomment to test the populated state:
    { id: 'a1', name: 'Vanilla 1.21', version: '1.21', lastPlayed: 'Today' },
    {
      id: 'b2',
      name: 'Modded Survival',
      version: '1.20.4',
      lastPlayed: 'Last week',
    },
    { id: 'c3', name: 'Skyblock Test', version: '1.19.2' },
  ]);

  const [creating, setCreating] = useState(false);

  const isEmpty = instances.length === 0;

  return (
    <div className="flex h-full w-full flex-col p-6">
      <MorphingDialog open={creating} onOpenChange={setCreating}>
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
                <InstanceCard key={inst.id} instance={inst}></InstanceCard>
              ))}
            </div>
          </>
        )}

        {/* Dialog — same content for both states */}
        <MorphingDialogContainer>
          <MorphingDialogContent className="border-saturn-950 bg-background relative w-full max-w-md rounded-md border-2 p-6">
            <MorphingDialogTitle className="text-muted-foreground text-sm font-thin tracking-[0.2em] uppercase">
              New Instance
            </MorphingDialogTitle>
            <MorphingDialogDescription className="text-muted-foreground mt-1 text-xs font-thin">
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
 * @param {{ instance: Instance }} props
 */
function InstanceCard({ instance }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.38, 1] }}
      className="border-saturn-950 hover:border-saturn-700/60 hover:bg-saturn-900/20 group flex min-h-48 cursor-pointer flex-col rounded-md border-2 p-5 transition-colors"
    >
      <p className="text-muted-foreground text-xs font-thin tracking-[0.2em] uppercase">
        {instance.version}
      </p>
      <p className="text-foreground mt-1 line-clamp-2 text-xl font-extralight tracking-tight">
        {instance.name}
      </p>
      <div className="mt-auto flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-thin">
          {instance.lastPlayed ?? 'Never played'}
        </span>
        <span
          aria-hidden="true"
          className="text-saturn-400 text-lg transition-transform group-hover:translate-x-0.5"
        >
          →
        </span>
      </div>
    </motion.div>
  );
}

function CreateInstanceForm() {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.14');

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
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <MorphingDialogClose className="border-saturn-950 hover:border-saturn-700/60 hover:bg-saturn-900/20 text-muted-foreground h-10 rounded-md border-2 px-4 text-sm font-thin transition-colors">
          Cancel
        </MorphingDialogClose>
      </div>
      <button
        type="button"
        /* TODO: call CreateInstance(name, version) once the binding exists */
        disabled={!name.trim()}
        className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 h-10 rounded-md border px-6 text-sm font-thin transition-colors disabled:pointer-events-none disabled:opacity-40"
      >
        Create
      </button>
    </>
  );
}
