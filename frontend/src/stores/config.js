import { useSyncExternalStore } from 'react';
import {
  GetLauncherConfig,
  SaveLauncherConfig,
} from '../../wailsjs/go/main/App';
import { toast } from '@/stores/toasts';

let state = {
  config: {},
  loading: true,
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

export function useConfig() {
  return useSyncExternalStore(subscribe, () => state);
}

export async function loadConfig() {
  try {
    const res = await GetLauncherConfig();
    setState({ config: res || {}, loading: false, error: null });
  } catch (e) {
    setState({ loading: false, error: e?.message ?? String(e) });
  }
}

export async function updateConfig(key, value) {
  const prevConfig = state.config;
  const newConfig = { ...prevConfig, [key]: value };

  setState({ config: newConfig });

  try {
    await SaveLauncherConfig(newConfig);
  } catch (e) {
    setState({ config: prevConfig });
    toast.error(e?.message ?? 'Failed to save configuration');
  }
}
