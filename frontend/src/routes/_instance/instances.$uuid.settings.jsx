import { useCallback, useEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';

import { useInstance } from '@/stores/instance';
import { onFileDrop } from '@/lib/backend';
import { toast } from '@/stores/toasts';

import {
  GetTotalRam,
  PickInstanceIcon,
  RenameInstance,
  SetInstanceIcon,
  UpdateInstanceDescription,
  UpdateJavaArgs,
  UpdateMem,
} from '../../../wailsjs/go/main/App';

import minecraftLogo from '@/assets/logos/minecraft.png';
import fabricLogo from '@/assets/logos/fabric.png';

export const Route = createFileRoute('/_instance/instances/$uuid/settings')({
  component: SettingsTab,
});

const RAM_MIN = 512;
const RAM_MAX = 65536;
const RAM_STEP = 256;

function SettingsTab() {
  const { uuid } = Route.useParams();
  const { data: instance, iconDataUrl, error: loadError } = useInstance();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [jvmArgs, setJvmArgs] = useState('');
  const [minRam, setMinRam] = useState(2048);
  const [maxRam, setMaxRam] = useState(4096);
  const [totalRamMB, setTotalRamMB] = useState(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);

  useEffect(() => {
    GetTotalRam()
      .then((r) => setTotalRamMB(r?.TotalRamMB ?? null))
      .catch(() => setTotalRamMB(null));
  }, []);

  const resetFromStore = useCallback(() => {
    if (!instance) return;
    setName(instance.name ?? '');
    setDescription(instance.description ?? '');
    setJvmArgs(instance.jvmArgs ?? '');
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
    if (saving || justSaved || !instance || !name.trim()) return;
    setSaving(true);
    try {
      await RenameInstance(uuid, name.trim());
      await UpdateInstanceDescription(uuid, description);
      await UpdateJavaArgs(uuid, jvmArgs);
      await UpdateMem(uuid, minRam, maxRam);

      await new Promise((resolve) => setTimeout(resolve, 800));

      setSaving(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch (e) {
      toast.error(e?.message ?? String(e));
      setSaving(false);
    }
  };

  const handleCancel = () => {
    resetFromStore();
  };

  const iconSrc = iconDataUrl
    ? `data:image/png;base64,${iconDataUrl}`
    : instance?.fabricVersion
      ? fabricLogo
      : minecraftLogo;

  const handleUploadIcon = async () => {
    if (iconUploading) return;
    setIconUploading(true);
    try {
      const path = await PickInstanceIcon();
      if (!path) return;
      await SetInstanceIcon(uuid, path);
    } catch (e) {
      toast.error(e?.message ?? String(e));
    } finally {
      setIconUploading(false);
    }
  };

  const handleDropUpload = async (path) => {
    if (iconUploading) return;
    setIconUploading(true);
    try {
      await SetInstanceIcon(uuid, path);
    } catch (e) {
      toast.error(e?.message ?? String(e));
    } finally {
      setIconUploading(false);
    }
  };

  return (
    <div className="flex min-h-full w-full flex-col">
      {loadError && (
        <p className="mb-6 text-xs font-thin text-red-400">
          Failed to load instance: {loadError}
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-8">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-foreground text-3xl font-normal tracking-tight">
                Settings
              </h1>
              <p className="text-muted-foreground mt-1 text-sm font-thin">
                Configure this instance.
              </p>
            </div>
            <div className="lg:hidden">
              <IconField
                uuid={uuid}
                iconSrc={iconSrc}
                iconUploading={iconUploading}
                onUploadClick={handleUploadIcon}
                onDropUpload={handleDropUpload}
                onDropError={(msg) => toast.error(msg)}
                compact={true}
              />
            </div>
          </header>
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
          <Field label="JVM Arguments">
            <JvmArgsInput value={jvmArgs} onChange={setJvmArgs} />
            <p className="text-muted-foreground mt-2 text-xs font-thin">
              Additional JVM arguments passed to the game. Separate multiple
              arguments with a space. Less is more and don't touch this if you
              don't know what you're doing!
            </p>
          </Field>
        </div>

        <div className="hidden lg:block lg:pt-22">
          <IconField
            uuid={uuid}
            iconSrc={iconSrc}
            iconUploading={iconUploading}
            onUploadClick={handleUploadIcon}
            onDropUpload={handleDropUpload}
            onDropError={(msg) => toast.error(msg)}
            compact={false}
          />
        </div>
      </div>

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
          disabled={saving || justSaved || !name.trim()}
          className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 flex h-10 w-28 items-center justify-center rounded-md border text-sm font-thin transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={saving ? 'saving' : justSaved ? 'saved' : 'idle'}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {saving ? 'Saving...' : justSaved ? 'Saved!' : 'Save'}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = '',
  labelClassName = 'text-sm',
}) {
  return (
    <section className={className}>
      {label && (
        <p
          className={`text-muted-foreground font-thin tracking-[0.2em] uppercase ${labelClassName}`}
        >
          {label}
        </p>
      )}
      <div className={label ? 'mt-4' : ''}>{children}</div>
    </section>
  );
}

function IconField({
  uuid,
  iconSrc,
  iconUploading,
  onUploadClick,
  onDropUpload,
  onDropError,
  compact = false,
}) {
  const [dragActive, setDragActive] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    const off = onFileDrop(async (x, y, paths) => {
      setDragActive(false);
      dragCounter.current = 0;

      const zone = document
        .elementsFromPoint(x, y)
        .map((el) => el?.closest?.('[data-icon-drop-zone]'))
        .find(Boolean);

      if (zone && zone.dataset.uuid !== uuid) return;

      const validPaths = paths.filter((p) => /\.(png|jpe?g)$/i.test(p));

      if (validPaths.length === 0) {
        onDropError('Only .png, .jpg and .jpeg files can be dropped here');
        return;
      }
      onDropUpload(validPaths[0]);
    });
    return off;
  }, [uuid, onDropUpload, onDropError]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDropOrEnd = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);
  };

  return (
    <Field
      label={compact ? null : 'Icon'}
      className={compact ? '' : 'text-center'}
      labelClassName={
        compact ? 'text-sm' : 'text-base font-normal tracking-[0.3em]'
      }
    >
      <div
        className={`flex flex-col ${compact ? 'w-32 shrink-0' : 'mx-auto w-full max-w-64'}`}
      >
        <div
          data-icon-drop-zone
          data-uuid={uuid}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDropOrEnd}
          onDragEnd={handleDropOrEnd}
          style={
            /** @type {import('react').CSSProperties} */ ({
              '--wails-drop-target': 'drop',
            })
          }
          className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border-2 transition-colors ${dragActive ? 'border-saturn-500 bg-saturn-900/20' : 'border-(--surface-border)'}`}
        >
          <img
            src={iconSrc}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
          />
          {dragActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-2 text-center text-[0.65rem] font-thin text-white backdrop-blur-sm">
              Drop image
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onUploadClick}
          disabled={iconUploading}
          className="text-muted-foreground mt-4 h-10 w-full rounded-md border-2 border-(--surface-border) text-sm font-thin transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) disabled:pointer-events-none disabled:opacity-40"
        >
          {iconUploading
            ? compact
              ? '...'
              : 'Uploading...'
            : compact
              ? 'Upload'
              : 'Upload Icon'}
        </button>
      </div>
    </Field>
  );
}

function highlightJvmArgs(args) {
  if (!args) return '';

  const escaped = args
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /(\s+)|(".*?")|(-(?:[XD]|XX:)[a-zA-Z0-9_:]*)|(=)|([+\-])|(\d+[a-zA-Z]?)|([^\s=+\-]+)/g,
    (match, space, str, flag, eq, op, num, word) => {
      if (space) return space;
      if (str) return `<span class="text-emerald-400">${str}</span>`;
      if (flag)
        return `<span class="text-saturn-400 font-medium">${flag}</span>`;
      if (eq) return `<span class="text-foreground/30">${eq}</span>`;
      if (op) return `<span class="text-foreground/30">${op}</span>`;
      if (num) return `<span class="text-amber-300">${num}</span>`;
      if (word) return `<span class="text-foreground/80">${word}</span>`;
      return match;
    }
  );
}

function JvmArgsInput({ value, onChange }) {
  const backdropRef = useRef(null);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (value !== lastValueRef.current) {
      lastValueRef.current = value;
      undoStackRef.current = [];
      redoStackRef.current = [];
    }
  }, [value]);

  const handleScroll = (e) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.target.scrollTop;
      backdropRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    if (newValue !== lastValueRef.current) {
      undoStackRef.current.push(lastValueRef.current);
      if (undoStackRef.current.length > 100) undoStackRef.current.shift();
      redoStackRef.current = [];
      lastValueRef.current = newValue;
    }
    onChange(newValue);
  };

  const handleKeyDown = (e) => {
    const isMod = e.ctrlKey || e.metaKey;
    if (!isMod) return;

    const key = e.key.toLowerCase();

    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (undoStackRef.current.length > 0) {
        const prev = undoStackRef.current.pop();
        redoStackRef.current.push(lastValueRef.current);
        lastValueRef.current = prev;
        onChange(prev);
      }
    } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
      e.preventDefault();
      if (redoStackRef.current.length > 0) {
        const next = redoStackRef.current.pop();
        undoStackRef.current.push(lastValueRef.current);
        lastValueRef.current = next;
        onChange(next);
      }
    }
  };

  return (
    <div className="bg-background relative flex w-full overflow-hidden rounded-md border border-(--hairline) transition-colors focus-within:border-(--chip-border-hover)">
      <div
        ref={backdropRef}
        className="pointer-events-none min-h-28 w-full overflow-hidden px-4 py-3 font-mono text-sm wrap-break-word whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: highlightJvmArgs(value) + '<br />' }}
      />
      <textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        spellCheck={false}
        placeholder="moreram morefps ultragraphics..."
        className="caret-foreground absolute inset-0 h-full w-full resize-none bg-transparent px-4 py-3 font-mono text-sm wrap-break-word whitespace-pre-wrap text-transparent outline-none placeholder:text-(--muted-foreground)/50"
      />
    </div>
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
