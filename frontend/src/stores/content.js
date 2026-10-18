import { useSyncExternalStore } from 'react';
import { onBackendEvent } from '@/lib/backend';
import { GetInstalledContent } from '../../wailsjs/go/main/App';
import { CONTENT_TYPES } from '@/lib/content-types';

// State:
// {
//   entries: {
//     'uuid:mods': { items, loading, error, loaded }
//   }
// }
//
// item: { filename, enabled, displayName, sizeBytes, iconUrl, version, source, ext }

let state = { entries: {} };

const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function setEntry(key, patch) {
  const prev = state.entries[key] ?? {
    items: [],
    loading: false,
    error: null,
    loaded: false,
  };
  setState({
    entries: { ...state.entries, [key]: { ...prev, ...patch } },
  });
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

export function useContent() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

function getExt(filename) {
  const base = filename.replace(/\.disabled$/i, '');
  const idx = base.lastIndexOf('.');
  return idx === -1 ? '' : base.slice(idx).toLowerCase();
}

function stripExt(filename) {
  return filename.replace(/\.disabled$/i, '').replace(/\.(jar|zip)$/i, '');
}

function itemFromRaw(raw) {
  if (typeof raw === 'string') {
    return {
      filename: raw,
      enabled: !raw.endsWith('.disabled'),
      displayName: stripExt(raw),
      sizeBytes: null,
      version: null,
      source: 'local',
      ext: getExt(raw),
    };
  }

  const filename = raw.FileName ?? raw.filename ?? '';
  const displayName = raw.Name || raw.Pack?.Name || stripExt(filename);

  return {
    filename,
    enabled: !filename.endsWith('.disabled'),
    displayName,
    sizeBytes: raw.FileSize ?? null,
    iconDataUrl: raw.Icon ? `data:image/png;base64,${raw.Icon}` : null,
    version: raw.Version || null,
    description: raw.Description || raw.Pack?.Description || null,
    authors: raw.Authors ?? [],
    source: 'local',
    ext: getExt(filename),
    isShader: raw.IsShader ?? false,
  };
}

export async function loadContent(uuid, contentType, { silent = false } = {}) {
  if (!uuid || !CONTENT_TYPES[contentType]) return;
  const key = `${uuid}:${contentType}`;

  if (!silent) {
    setEntry(key, { loading: true, error: null });
  }

  try {
    const backendKey = CONTENT_TYPES[contentType].backendKey;
    const raw = await GetInstalledContent(uuid, backendKey);
    const items = (raw ?? []).map(itemFromRaw);
    setEntry(key, { items, loading: false, error: null, loaded: true });
  } catch (e) {
    setEntry(key, {
      loading: false,
      error: e?.message ?? String(e),
      loaded: true,
    });
  }
}

export function patchContentItem(uuid, contentType, filename, updater) {
  const key = `${uuid}:${contentType}`;
  const entry = state.entries[key];
  if (!entry) return;
  const items = entry.items.map((it) =>
    it.filename === filename ? updater(it) : it
  );
  setEntry(key, { items });
}

let subsInstalled = false;

function installSubs() {
  if (subsInstalled) return;
  subsInstalled = true;

  onBackendEvent('instance:changed', () => {
    for (const key of Object.keys(state.entries)) {
      const [uuid, contentType] = key.split(':');
      void loadContent(uuid, contentType, { silent: true });
    }
  });
}

installSubs();
