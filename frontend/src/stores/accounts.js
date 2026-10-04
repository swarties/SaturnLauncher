import { useSyncExternalStore } from 'react';
import { GetActiveAccount, ListAccounts } from '../../wailsjs/go/main/App';

let state = {
  accounts: [],
  activeUuid: null,
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

const getSnapshot = () => state;

export function useAccounts() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export async function refreshAccounts() {
  try {
    const list = await ListAccounts();
    const active = await GetActiveAccount().catch(() => null);
    setState({
      accounts: list ?? [],
      activeUuid: active?.uuid ?? null,
      loading: false,
      error: null,
    });
  } catch (e) {
    setState({
      loading: false,
      error: e?.message ?? String(e),
    });
  }
}
