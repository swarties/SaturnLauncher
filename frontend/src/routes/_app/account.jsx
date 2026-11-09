import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { createFileRoute } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';

import {
  copyText,
  onBackendEvent,
  onFileDrop,
  openExternalURL,
  startLogin,
} from '@/lib/backend';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  LogOut,
  Plus,
  UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { refreshAccounts, useAccounts } from '@/stores/accounts';
import { toast } from '@/stores/toasts';
import {
  DeleteAccount,
  GetSkinPreview,
  PickSkin,
  SetActiveAccount,
  StartApp,
  UploadSkin,
} from '../../../wailsjs/go/main/App';
import { CachedImage } from '@/components/ui/cached-image';

export const Route = createFileRoute('/_app/account')({
  component: AccountPage,
});

const EASE = [0.22, 1, 0.38, 1];

function AccountPage() {
  const { accounts, activeUuid, loading, error } = useAccounts();

  const [selectedUuid, setSelectedUuid] = useState(null);
  const [direction, setDirection] = useState(1);

  const [switchBusy, setSwitchBusy] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(null);

  const [adding, setAdding] = useState(false);
  const [addCode, setAddCode] = useState(null);
  const [addUri, setAddUri] = useState(null);
  const [addError, setAddError] = useState(null);

  const currentUuid = accounts.some((a) => a.uuid === selectedUuid)
    ? selectedUuid
    : activeUuid;
  const safeIndex = Math.max(
    0,
    accounts.findIndex((a) => a.uuid === currentUuid)
  );
  const current = accounts[safeIndex];
  const showArrows = accounts.length > 1;

  useEffect(() => {
    void refreshAccounts();
    const offChanged = onBackendEvent('account:changed', refreshAccounts);
    const offLogin = onBackendEvent('login:success', refreshAccounts);
    return () => {
      if (typeof offChanged === 'function') offChanged();
      if (typeof offLogin === 'function') offLogin();
    };
  }, []);

  useEffect(() => {
    if (activeUuid) {
      setSelectedUuid(activeUuid);
    }
  }, [activeUuid]);

  useEffect(() => {
    if (!adding) return;

    const offCode = onBackendEvent('login:send_received', (payload) => {
      const code = payload?.userCode ?? payload?.user_code;
      const uri = payload?.verificationUri ?? payload?.verification_uri;
      setAddCode(code ?? null);
      setAddUri(uri ?? null);
      if (uri) openExternalURL(uri);
      if (code) void copyText(code);
    });

    const offSuccess = onBackendEvent('login:success', () => {
      setAdding(false);
      setAddCode(null);
      setAddUri(null);
      setAddError(null);
      void StartApp();
    });

    const offError = onBackendEvent('login:error', (msg) => {
      setAddError(msg ?? 'Sign-in failed');
    });

    return () => {
      if (typeof offCode === 'function') offCode();
      if (typeof offSuccess === 'function') offSuccess();
      if (typeof offError === 'function') offError();
    };
  }, [adding]);

  const goNext = () => {
    if (accounts.length < 2) return;
    setDirection(1);
    const nextIdx = (safeIndex + 1) % accounts.length;
    setSelectedUuid(accounts[nextIdx].uuid);
  };

  const goPrev = () => {
    if (accounts.length < 2) return;
    setDirection(-1);
    const prevIdx = (safeIndex - 1 + accounts.length) % accounts.length;
    setSelectedUuid(accounts[prevIdx].uuid);
  };

  const handleSwitch = async (uuid) => {
    if (uuid === activeUuid || switchBusy) return;
    setSwitchBusy(uuid);
    try {
      await SetActiveAccount(uuid);
      await StartApp();
    } catch (e) {
      toast.error(e?.message ?? String(e));
    } finally {
      setSwitchBusy(null);
    }
  };

  const handleDelete = async (uuid) => {
    if (deleteBusy) return;
    setDeleteBusy(uuid);
    try {
      const wasActive = uuid === activeUuid;
      await DeleteAccount(uuid);
      if (!wasActive) {
        void refreshAccounts();
        return;
      }
      const remaining = accounts.filter((a) => a.uuid !== uuid);
      if (remaining.length > 0) {
        await SetActiveAccount(remaining[0].uuid);
      }
      await StartApp();
    } catch (e) {
      toast.error(e?.message ?? String(e));
    } finally {
      setDeleteBusy(null);
    }
  };

  const handleAddClick = () => {
    setAdding(true);
    setAddError(null);
    setAddCode(null);
    setAddUri(null);
    void startLogin();
  };

  const cancelAdd = () => {
    setAdding(false);
    setAddCode(null);
    setAddUri(null);
    setAddError(null);
  };

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex h-[85vh] w-full max-w-6xl items-stretch gap-5">
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {showArrows && <CarouselArrow direction="up" onClick={goPrev} />}
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border-2 border-(--surface-border)">
            {loading && !accounts.length ? (
              <div className="flex h-full items-center justify-center p-8">
                <p className="text-muted-foreground text-sm font-thin">
                  Loading accounts...
                </p>
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center p-8">
                <p className="text-xs font-thin text-red-400">{error}</p>
              </div>
            ) : current ? (
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={current.uuid}
                  custom={direction}
                  variants={{
                    enter: (d) => ({
                      opacity: 0,
                      y: d * 40,
                      filter: 'blur(6px)',
                    }),
                    center: { opacity: 1, y: 0, filter: 'blur(0px)' },
                    exit: (d) => ({
                      opacity: 0,
                      y: d * -40,
                      filter: 'blur(6px)',
                    }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: EASE }}
                  className="h-full"
                >
                  <AccountCard
                    account={current}
                    isActive={current.uuid === activeUuid}
                    switching={switchBusy === current.uuid}
                    deleting={deleteBusy === current.uuid}
                    onSwitch={() => handleSwitch(current.uuid)}
                    onDelete={() => handleDelete(current.uuid)}
                  />
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex h-full items-center justify-center p-8">
                <p className="text-muted-foreground text-sm font-thin">
                  No accounts yet
                </p>
              </div>
            )}
          </div>

          {showArrows && <CarouselArrow direction="down" onClick={goNext} />}

          <button
            type="button"
            onClick={handleAddClick}
            disabled={adding}
            className="group mt-2 flex h-14 shrink-0 cursor-pointer items-center justify-center gap-3 rounded-md border-2 border-(--surface-border) transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) disabled:pointer-events-none disabled:opacity-60"
          >
            <Plus
              aria-hidden="true"
              className="text-saturn-500 size-5 transition-colors group-hover:text-(--saturn-fg-strong)"
            />
            <span className="text-muted-foreground text-sm font-thin tracking-[0.2em] uppercase transition-colors group-hover:text-(--saturn-fg)">
              {adding ? 'Waiting for sign-in...' : 'Add Account'}
            </span>
          </button>
        </div>

        <SkinManager username={current?.username} />
      </div>

      <AnimatePresence>
        {adding && (
          <AddAccountOverlay
            code={addCode}
            uri={addUri}
            error={addError}
            onCancel={cancelAdd}
          ></AddAccountOverlay>
        )}
      </AnimatePresence>
    </div>
  );
}

function CarouselArrow({ direction, onClick }) {
  const Icon = direction === 'up' ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 'up' ? 'Previous account' : 'Next account'}
      data-tooltip={direction === 'up' ? 'Previous' : 'Next'}
      className="text-muted-foreground flex h-8 w-full shrink-0 items-center justify-center rounded-md border border-(--hairline) transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover) hover:text-(--saturn-fg-hover)"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

function AccountCard({
  account,
  isActive,
  switching,
  deleting,
  onSwitch,
  onDelete,
}) {
  const [copiedUUID, setCopiedUUID] = useState(false);
  const [uuidHover, setUuidHover] = useState(false);

  const handleCopyUUID = async () => {
    const ok = await copyText(account.uuid);
    if (!ok) return;
    setCopiedUUID(true);
    window.setTimeout(() => setCopiedUUID(false), 1000);
  };

  const handleUuidEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    setUuidHover(true);
  };

  const handleUuidLeave = () => setUuidHover(false);

  useEffect(() => {
    const onBlur = () => setCopiedUUID(false);
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  const busy = switching || deleting;

  return (
    <div className="relative flex h-full flex-col p-8">
      <button
        type="button"
        onClick={onSwitch}
        disabled={isActive || busy}
        className={[
          'absolute top-6 right-6 h-9 rounded-lg border px-4 text-xs font-thin tracking-[0.2em] uppercase transition-colors',
          isActive
            ? 'cursor-default border-(--surface-border) bg-(--surface-active) text-(--saturn-fg-strong)'
            : 'border-(--chip-border) bg-(--chip-bg) text-(--chip-fg) hover:border-(--chip-border-hover) hover:bg-(--chip-bg-hover) hover:text-(--chip-fg-hover)',
          'disabled:pointer-events-default',
        ].join(' ')}
      >
        {isActive ? 'Selected' : switching ? 'Switching...' : 'Select'}
      </button>

      <div className="mt-10 flex h-full w-full flex-col gap-6">
        <div className="flex items-center gap-6">
          <CachedImage
            src={`https://mc-heads.net/avatar/${account.uuid}/128`}
            alt=""
            draggable={false}
            className="h-24 w-24 rounded-md"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-foreground text-3xl font-extralight tracking-tight">
              {account.username}
            </p>
            <div className="flex min-w-0 overflow-hidden">
              <p className="text-muted-foreground shrink-0 text-xs font-thin tracking-[0.2em] uppercase">
                UUID:
              </p>
              <button
                type="button"
                data-tooltip="Copy UUID"
                onClick={handleCopyUUID}
                onMouseEnter={handleUuidEnter}
                onMouseLeave={handleUuidLeave}
                style={{ '--mx': '50%' }}
                className={[
                  'text-muted-foreground relative text-xs font-thin tracking-[0.2em] uppercase',
                  copiedUUID ? 'cursor-default' : 'cursor-pointer',
                  'after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-(--mx) after:bg-current after:transition-transform after:duration-200',
                  uuidHover ? 'after:scale-x-100' : 'after:scale-x-0',
                  copiedUUID ? 'after:opacity-0' : 'after:opacity-100',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {copiedUUID ? 'Copied UUID!' : account.uuid}
              </button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center py-4">
          <CachedImage
            src={`https://render.crafty.gg/3d/full/${account.username}?width=300&height=360&x=30&z=50`}
            alt=""
            draggable={false}
            className="h-full max-h-75 w-auto object-contain drop-shadow-xl"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-(--divider) pt-6 sm:grid-cols-2">
          <Button
            variant="outline"
            onClick={() =>
              openExternalURL('https://www.minecraft.net/en-us/msaprofile')
            }
            className="flex h-12 items-center justify-center gap-2 rounded-lg border-(--chip-border) bg-(--chip-bg) px-6 font-thin text-(--chip-fg) hover:border-(--chip-border-hover) hover:bg-(--chip-bg-hover) hover:text-(--chip-fg-hover)"
          >
            Manage on minecraft.net
            <ExternalLink
              className="text-saturn-400 size-4 shrink-0"
              aria-hidden="true"
            />
          </Button>
          <Button
            variant="outline"
            onClick={onDelete}
            disabled={busy}
            className="flex h-12 items-center justify-center gap-2 rounded-lg border-(--danger-border) bg-(--danger-bg) px-6 font-thin text-(--danger-fg) hover:border-(--danger-border-hover) hover:bg-(--danger-bg-hover) hover:text-(--danger-fg-hover) disabled:pointer-events-none disabled:opacity-40"
          >
            {deleting ? 'Deleting...' : isActive ? 'Log Out' : 'Delete Account'}
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddAccountOverlay({ code, uri, error, onCancel }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-(--backdrop) backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="bg-background w-full max-w-sm rounded-md border-2 border-(--surface-border) p-6 text-center"
      >
        {error ? (
          <>
            <p className="text-foreground text-lg font-extralight tracking-tight">
              Sign-in failed
            </p>
            <p className="mt-2 text-xs font-thin text-red-400">{error}</p>
            <button
              type="button"
              onClick={onCancel}
              className="text-muted-foreground mt-6 h-10 w-full rounded-md border-2 border-(--surface-border) text-sm font-thin transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover)"
            >
              Close
            </button>
          </>
        ) : code ? (
          <>
            <p className="text-foreground text-lg font-extralight tracking-tight">
              Enter this code
            </p>

            <p className="text-muted-foreground mt-1 text-xs font-thin">
              Sign in on the Microsoft page that just opened.
            </p>
            <code className="mt-4 block w-full rounded-md border border-(--code-border) bg-(--code-bg) px-4 py-3 font-mono text-xl tracking-[0.2em] text-(--code-fg)">
              {code}
            </code>
            {uri && (
              <button
                type="button"
                onClick={() => openExternalURL(uri)}
                className="text-muted-foreground mt-3 text-xs font-thin underline underline-offset-4 transition-colors hover:text-(--saturn-fg)"
              >
                Reopen Microsoft sign-in
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="text-muted-foreground mt-6 h-10 w-full rounded-md border-2 border-(--surface-border) text-sm font-thin transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover)"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <p className="text-foreground text-lg font-extralight tracking-tight">
              Starting sign-in...
            </p>
            <p className="text-muted-foreground mt-2 text-xs font-thin">
              Requesting a device code from Microsoft.
            </p>
            <button
              type="button"
              onClick={onCancel}
              className="text-muted-foreground mt-6 h-10 w-full rounded-md border-2 border-(--surface-border) text-sm font-thin transition-colors hover:border-(--surface-border-hover) hover:bg-(--surface-hover)"
            >
              Cancel
            </button>
          </>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}

function SkinManager({ username }) {
  const [path, setPath] = useState('');
  const [preview, setPreview] = useState(null);
  const [variant, setVariant] = useState('classic'); // 'classic' || 'slim'
  const [hoveredVariant, setHoveredVariant] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const dragCounter = useRef(0);

  const loadFile = async (filePath) => {
    try {
      setPath(filePath);
      const b64 = await GetSkinPreview(filePath);
      setPreview(`data:image/png;base64,${b64}`);
    } catch (e) {
      toast.error('Failed to load image preview.');
      setPath('');
      setPreview(null);
    }
  };

  useEffect(() => {
    const off = onFileDrop(async (x, y, paths) => {
      setDragActive(false);
      dragCounter.current = 0;

      const zone = document
        .elementsFromPoint(x, y)
        .map((el) => el?.closest?.('[data-skin-dropzone]'))
        .find(Boolean);

      if (!zone) return;

      const valid = paths.find((p) => p.toLowerCase().endsWith('.png'));
      if (!valid) {
        toast.error('Only .png files are allowed for skins.');
        return;
      }
      void loadFile(valid);
    });
    return off;
  }, []);

  const handlePick = async () => {
    try {
      const p = await PickSkin();
      if (p) {
        void loadFile(p);
      }
    } catch (e) {
      toast.error(e?.message ?? 'Failed to pick file.');
    }
  };

  const handleUpload = async () => {
    if (!path || uploading) return;
    setUploading(true);
    try {
      await UploadSkin(path, variant);
      toast.success('Skin uploaded successfully!');
      setPath('');
      setPreview(null);
    } catch (e) {
      toast.error(e?.message ?? 'Failed to upload skin.');
      console.log('Failed to upload skin:', e);
    } finally {
      setUploading(false);
    }
  };

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

  return (
    <div className="flex flex-1 flex-col rounded-md border-2 border-(--surface-border) p-8">
      <div className="mb-6">
        <h2 className="text-foreground text-lg font-extralight tracking-tight">
          Skin Manager
        </h2>
        <p className="text-muted-foreground mt-1 text-sm font-thin">
          Upload a new skin for {username ?? 'your account'}
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="flex min-h-[300px] w-full flex-1 items-center justify-center rounded-md border border-(--hairline) bg-(--surface-active)/30 p-6">
          {preview ? (
            <img
              src={preview}
              alt="Skin Preview"
              className="h-full max-h-[40vh] w-auto rounded object-contain drop-shadow-xl [image-rendering:pixelated]"
            />
          ) : (
            <p className="text-muted-foreground/60 text-sm font-thin">
              No skin selected
            </p>
          )}
        </div>

        <div
          data-skin-dropzone
          style={
            /** @type {import('react').CSSProperties} */ ({
              '--wails-drop-target': 'drop',
            })
          }
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            dragCounter.current = 0;
            setDragActive(false);
          }}
          onClick={handlePick}
          className={[
            'group flex h-32 w-full shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed transition-all duration-200',
            dragActive
              ? 'border-saturn-400 bg-(--surface-hover)'
              : 'hover:border-saturn-500/50 border-(--surface-border) hover:bg-(--surface-hover) hover:shadow-lg',
          ].join(' ')}
        >
          <UploadCloud
            className="text-muted-foreground/60 group-hover:text-saturn-400 size-8 transition-colors"
            strokeWidth={1.5}
          />
          <div className="flex flex-col items-center gap-0.5 text-center">
            <p className="text-foreground text-sm font-normal">
              {preview ? 'Replace skin' : 'Click or drag in a .png'}
            </p>
            <p className="text-muted-foreground text-xs font-thin">
              64x64 image required
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-6 border-t border-(--divider) pt-6">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-thin tracking-[0.2em] uppercase">
            Variant
          </span>
          <div
            className="relative flex h-11 rounded-md border border-(--hairline) p-1"
            onMouseLeave={() => setHoveredVariant(null)}
          >
            {['classic', 'slim'].map((v) => {
              const isHovered = (hoveredVariant ?? variant) === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVariant(v)}
                  onMouseEnter={() => setHoveredVariant(v)}
                  className={[
                    'relative z-10 flex flex-1 items-center justify-center rounded-sm px-6 text-sm font-thin transition-colors',
                    variant === v
                      ? 'text-(--saturn-fg-strong)'
                      : 'text-muted-foreground hover:text-(--saturn-fg)',
                  ].join(' ')}
                >
                  {isHovered && (
                    <motion.div
                      layoutId="skin-variant-pill"
                      className="absolute inset-0 rounded-sm bg-(--surface-active)"
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 35,
                      }}
                    />
                  )}
                  <span className="relative z-10 capitalize">{v}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={handleUpload}
          disabled={!path || uploading}
          className="border-saturn-700/60 bg-saturn-900 text-saturn-100 hover:bg-saturn-800 hover:text-saturn-50 flex h-11 items-center justify-center rounded-md border px-8 text-sm font-thin transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            'Apply Skin'
          )}
        </button>
      </div>
    </div>
  );
}
