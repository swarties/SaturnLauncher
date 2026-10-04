import { useSyncExternalStore } from 'react';
import { GetInstanceInfo } from '../../wailsjs/go/main/App';

let state = {
  uuid: null,
  data: null,
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

function fetch(uuid, { silent = false } = {}) {
  if (!silent) setState({ uuid, data: null, loading: true, error: null });
  GetInstanceInfo(uuid)
    .then((data) => {
      if (currentUuid !== uuid) return;
      setState({ data, loading: false, error: null });
    })
    .catch((e) => {
      if (currentUuid !== uuid) return;
      setState({ data: null, loading: false, error: e?.message ?? String(e) });
    });
}

export function loadInstance(uuid) {
  if (currentUuid === uuid && state.data) return;
  currentUuid = uuid;
  fetch(uuid);
}

export function refreshInstance() {
  if (!currentUuid) return;
  fetch(currentUuid, { silent: true });
}

export function clearInstance() {
  currentUuid = null;
  setState({ uuid: null, data: null, loading: false, error: null });
}
