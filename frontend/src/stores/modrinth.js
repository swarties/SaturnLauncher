import { useSyncExternalStore } from 'react';
import {
  GetDiscoveryPage,
  GetProjectVersions,
  InstallProjectContent,
} from '../../wailsjs/go/main/App';
import { toast } from '@/stores/toasts';

let state = {
  query: '',
  activeTab: 'mod', // mod, resourcepack, shader
  results: [],
  loading: false,
  error: null,
  installing: {}, // { [projectId]: boolean }
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

export function useModrinth() {
  return useSyncExternalStore(subscribe, () => state);
}

export async function fetchDiscovery(uuid, version, query, tab) {
  setState({ query, activeTab: tab, loading: true, error: null });
  try {
    const res = await GetDiscoveryPage(tab, version, '', query);
    setState({ results: res.hits ?? [], loading: false });
  } catch (e) {
    setState({ error: e?.message ?? String(e), loading: false });
  }
}

export async function installMod(uuid, projectId, gameVersion, projectType) {
  if (state.installing[projectId]) return;

  setState({ installing: { ...state.installing, [projectId]: true } });

  try {
    const versions = await GetProjectVersions(projectId, gameVersion);
    if (!versions || versions.length === 0) {
      throw new Error('No compatible versions found for this instance');
    }
    const latestVersion = versions[0];

    const contentType =
      projectType === 'mod'
        ? 'mods'
        : projectType === 'resourcepack'
          ? 'resourcepacks'
          : 'shaders';
    await InstallProjectContent(uuid, contentType, latestVersion.id);
  } catch (e) {
    toast.error(e?.message ?? 'Failed to install');
  } finally {
    setState({ installing: { ...state.installing, [projectId]: false } });
  }
}
