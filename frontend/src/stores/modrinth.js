import { useSyncExternalStore } from 'react';
import {
  GetDiscoveryPage,
  GetProjectPage,
  GetProjectVersions,
  InstallProjectContent,
} from '../../wailsjs/go/main/App';
import { toast } from '@/stores/toasts';

let state = {
  query: '',
  activeTab: 'mod', // mod, resourcepack, shader
  sortBy: 'relevance',
  results: [],
  loading: false,
  error: null,
  installing: {}, // { [projectId]: boolean }
  installed: {}, // { [projectId]: boolean }
  versions: {}, // { [projectId]: { loading: boolean, data: Array } }
  projects: {}, // { [projectId]: { loading, data, error } }
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

export function setSortBy(sortBy) {
  setState({ sortBy });
}

export async function fetchDiscovery(uuid, version, query, tab) {
  setState({ query, activeTab: tab, loading: true, error: null });
  try {
    const res = await GetDiscoveryPage(tab, version, '', query, uuid);
    setState({ results: res.hits ?? [], loading: false });
  } catch (e) {
    setState({ error: e?.message ?? String(e), loading: false });
  }
}

export async function fetchVersions(projectId, gameVersion, projectType) {
  if (state.versions[projectId]?.data || state.versions[projectId]?.loading)
    return;

  setState({ versions: { ...state.versions, [projectId]: { loading: true } } });

  try {
    const res = await GetProjectVersions(projectId, gameVersion, projectType);
    setState({
      versions: { ...state.versions, [projectId]: { data: res ?? [] } },
    });
  } catch (e) {
    console.error('Failed to load versions:', e);
    setState({ versions: { ...state.versions, [projectId]: { data: [] } } });
    toast.error(e?.message ?? 'Failed to load versions');
  }
}

export async function fetchProject(projectId) {
  const existing = state.projects[projectId];
  if (existing?.data || existing?.loading) return;

  setState({
    projects: {
      ...state.projects,
      [projectId]: { loading: true, data: null, error: null },
    },
  });

  try {
    const res = await GetProjectPage(projectId);
    setState({
      projects: {
        ...state.projects,
        [projectId]: { loading: false, data: res ?? null, error: null },
      },
    });
  } catch (e) {
    console.error('Failed to load project:', e);
    setState({
      ...state.projects,
      [projectId]: {
        loading: false,
        data: null,
        error: e?.message ?? String(e),
      },
    });
  }
}

export async function installMod(
  uuid,
  projectId,
  versionId,
  versionName,
  projectType
) {
  if (state.installing[projectId]) return;

  setState({ installing: { ...state.installing, [projectId]: true } });

  try {
    const contentType =
      projectType === 'mod'
        ? 'mods'
        : projectType === 'resourcepack'
          ? 'resourcepacks'
          : 'shaders';

    await InstallProjectContent(uuid, contentType, versionId, projectType);

    toast.success(`Installed ${versionName}`);
    setState({ installed: { ...state.installed, [projectId]: true } });
    setTimeout(() => {
      setState({ installed: { ...state.installed, [projectId]: false } });
    }, 3000);
  } catch (e) {
    console.error('Failed to install mod:', e);
    toast.error(e?.message ?? 'Failed to install');
  } finally {
    setState({ installing: { ...state.installing, [projectId]: false } });
  }
}
