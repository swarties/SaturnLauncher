import { useSyncExternalStore } from 'react';
import { GetInstanceInfo, GetInstanceIcon } from '../../wailsjs/go/main/App';

let state = {
  uuid: null,
  data: null,
  iconDataUrl: null,
  loading: false,
  error: null,
};

const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

export function useInstance() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

let currentUuid = null;

async function fetch(uuid, { silent = false } = {}) {
  if (!silent) {
    setState({
      uuid,
      data: null,
      iconDataUrl: null,
      loading: true,
      error: null,
    });
  }

  try {
    const data = await GetInstanceInfo(uuid);
    if (currentUuid !== uuid) return;
    const icon = await GetInstanceIcon(uuid).catch(() => '');
    if (currentUuid !== uuid) return;
    setState({
      data,
      iconDataUrl: icon || null,
      loading: false,
      error: null,
    });
  } catch (e) {
    if (currentUuid !== uuid) return;
    setState({
      data: null,
      iconDataUrl: null,
      loading: false,
      error: e?.message ?? String(e),
    });
  }
}

export function loadInstance(uuid) {
  if (currentUuid === uuid && state.data) return;
  currentUuid = uuid;
  void fetch(uuid);
}

export function refreshInstance() {
  if (!currentUuid) return;
  void fetch(currentUuid, { silent: true });
}

export function clearInstance() {
  currentUuid = null;
  setState({
    uuid: null,
    data: null,
    iconDataUrl: null,
    loading: false,
    error: null,
  });
}
