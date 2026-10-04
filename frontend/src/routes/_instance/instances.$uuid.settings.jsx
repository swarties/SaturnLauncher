import { useState, useEffect, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';

import { MOCK_INSTANCE } from '@/lib/mock-instance.js';
import { useInstance } from '@/stores/instance.js';

import {
  GetTotalRam,
  RenameInstance,
  UpdateMem,
} from '../../../wailsjs/go/main/App';

export const Route = createFileRoute('/_instance/instances/$uuid/settings')({
  component: SettingsTab,
});

const RAM_MIN = 512;
const RAM_MAX = 65536;
const RAM_STEP = 256;

function SettingsTab() {
  const { uuid } = Route.useParams();
  const { data: instance, error: loadError } = useInstance();

  const [name, setName] = useState('');
  const [description, setDescription] = useState(MOCK_INSTANCE.description);
  const [minRam, setMinRam] = useState(2048);
  const [maxRam, setMaxRam] = useState(4096);
  const [totalRamMB, setTotalRamMB] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    GetTotalRam()
      .then((r) => setTotalRamMB(r?.TotalRamMB ?? null))
      .catch(() => setTotalRamMB(null));
  }, []);

  const resetFromStore = useCallback(() => {
    if (!instance) return;
    setName(instance.name ?? '');
    setDescription(MOCK_INSTANCE.description);
    setMinRam(instance.minram ?? 2048);
    setMaxRam(instance.maxram ?? 4096);
  }, [instance]);

  useEffect(() => {
    resetFromStore();
  }, [resetFromStore]);

  const dynamicMax = totalRamMB
    ? Math.max(RAM_MIN, totalRamMB - 1024)
    : RAM_MAX;

  const updateMin = (v) => {
    setMinRam(v);
    if (v > maxRam) setMaxRam(v);
  };

  const updateMax = (v) => {
    setMaxRam(v);
    if (v < minRam) setMinRam(v);
  };

  const handleSave = async () => {
    if (saving || !instance || !name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await RenameInstance(uuid, name.trim());
      await UpdateMem(uuid, minRam, maxRam);
    } catch (e) {
      setSaveError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSaveError(null);
    resetFromStore();
  };

  return (
    <div className="flex min-h-full w-full flex-col">
      <header className="mb-8">
        <h1 className="text-foreground text-3xl font-normal tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm font-thin">
          Configure this instance.
        </p>
      </header>

      {loadError && (
        <p className="mb-6 text-xs font-thin text-red-400">
          Failed to load instance: {loadError}
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-8">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background text-foreground h-11 w-full rounded-md border border-(--hairline) px-4 text-sm font-normal transition-colors outline-none focus:border-(--chip-border-hover)"
            />
          </Field>

          <Field label="Description">
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background text-foreground w-full resize-none rounded-md border border-(--hairline) px-4 py-3 text-sm font-normal transition-colors outline-none focus:border-(--chip-border-hover)"
            />
          </Field>
          <Field label="Memory">
            <div className="flex flex-col gap-5">
              <RamSlider
                label="Minimum"
                value={minRam}
                onChange={updateMin}
                max={dynamicMax}
              />
              <RamSlider
                label="Maximum"
                value={maxRam}
                onChange={updateMax}
                max={dynamicMax}
              />
            </div>
          </Field>
        </div>

        <Field label="Icon">
          <div className="mx-auto flex w-full max-w-52 flex-col">
            <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border-2 border-(--surface-border)">
              <img
                src={MOCK_INSTANCE.icon}
                alt=""
                draggable={false}
                className="h-full w-full object-cover"
              />
            </div>
            <button
              type="button"
              className="text-muted-foreground mt-4 h-10 w-full rounded-md border-2 border-(--surface-border) text-sm font-thin transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover)"
            >
              Upload Icon
            </button>
          </div>
        </Field>
      </div>
      {/* Placeholder bars — spot reserved for future settings sections */}
      <div className="mt-10 flex flex-col gap-4">
        <div className="h-10 w-40 rounded-sm bg-(--surface-active)" />
        <div className="h-4 w-3/4 rounded-sm bg-(--surface-active)" />
        <div className="h-4 w-full rounded-sm bg-(--surface-active)" />
      </div>
      {saveError && (
        <p className="mt-6 text-xs font-thin text-red-400">{saveError}</p>
      )}
      <div className="mt-auto flex justify-end gap-3 border-t border-(--divider) pt-6">
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="text-muted-foreground h-10 rounded-md border-2 border-(--surface-border) px-6 text-sm font-thin transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) disabled:pointer-events-none disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 h-10 rounded-md border px-6 text-sm font-thin transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <section>
      <p className="text-muted-foreground text-sm font-thin tracking-[0.2em] uppercase">
        {label}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RamSlider({ label, value, onChange, max = RAM_MAX }) {
  const [draft, setDraft] = useState(null);

  const display = draft ?? (value / 1024).toFixed(2);

  const commit = () => {
    if (draft === null) return;
    const parsed = parseFloat(draft);
    setDraft(null);
    if (Number.isNaN(parsed)) return;
    const mb = Math.round((parsed * 1024) / RAM_STEP) * RAM_STEP;
    const clamped = Math.min(max, Math.max(RAM_MIN, mb));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-muted-foreground w-24 shrink-0 text-sm font-thin tracking-[0.2em] uppercase">
        {label}
      </span>
      <input
        type="range"
        min={RAM_MIN}
        max={max}
        step={RAM_STEP}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="saturn-slider flex-1"
      />
      <div className="flex w-22 shrink-0 items-stretch overflow-hidden rounded-md border border-(--code-border) bg-(--code-bg) text-xs font-thin transition-colors focus-within:border-(--chip-border-hover)">
        <input
          type="text"
          inputMode="decimal"
          value={display}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              setDraft(null);
              e.currentTarget.blur();
            }
          }}
          className="text-foreground w-full min-w-0 bg-transparent px-3 py-1.5 text-right tabular-nums outline-none"
        />
        <span
          aria-hidden="true"
          className="text-muted-foreground flex shrink-0 items-center pr-3"
        >
          GiB
        </span>
      </div>
    </div>
  );
}
