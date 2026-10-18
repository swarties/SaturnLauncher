import { useSyncExternalStore } from 'react';
import { onBackendEvent } from '@/lib/backend';
import { StartGame } from '../../wailsjs/go/main/App';

const STEP_CEILINGS = {
  'Downloading Client Jar': 15,
  'Downloading Libraries': 35,
  'Downloading Game Assets': 85,
  'Extracting Natives': 93,
};

const CREEP_INTERVAL_MS = 60;
const CREEP_COEFFICIENT = 0.015;
const CREEP_MIN_STEP = 0.02;
const MIN_LAUNCH_MS = 2200;
const EXIT_MESSAGE_MS = 5000;

// State:
// {
//   instances: {
//     [uuid]: { phase, progress, status, statusKind, exitCode }
//   }
// }
//
// phase: 'launching' | 'running' | 'exited' | 'crashed' | 'error'
// Absence from `instances` == idle.

let state = { instances: {} };

let currentValue = 0;
let currentCeiling = 0;
let creepInterval = null;
let lastStatusCommit = 0;
let activeLaunchUuid = null;
let exitTimers = new Map();

const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function setInstance(uuid, patch) {
  const prev = state.instances[uuid] ?? {};
  setState({
    instances: { ...state.instances, [uuid]: { ...prev, ...patch } },
  });
}

function clearInstance(uuid) {
  const next = { ...state.instances };
  delete next[uuid];
  setState({ instances: next });
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

export function useLaunch() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

const MIN_STATUS_MS = 250;

let subsInstalled = false;

function installSubs() {
  if (subsInstalled) return;
  subsInstalled = true;

  onBackendEvent('download:progress', (msg) => {
    if (typeof msg !== 'string') return;
    if (!activeLaunchUuid) return;

    const ceil = STEP_CEILINGS[msg];
    if (typeof ceil === 'number' && ceil > currentCeiling) {
      currentCeiling = ceil;
    }
    if (msg === 'Done!') return;

    // Warm-cache throttling: collapse rapid-fire labels.
    const now = performance.now();
    if (now - lastStatusCommit >= MIN_STATUS_MS) {
      lastStatusCommit = now;
      setInstance(activeLaunchUuid, { status: msg, statusKind: 'progress' });
    }
  });

  onBackendEvent('game:started', (folderId) => {
    if (typeof folderId !== 'string') return;
    stopCreep();
    currentValue = 0;
    currentCeiling = 0;
    if (activeLaunchUuid === folderId) activeLaunchUuid = null;

    setInstance(folderId, {
      phase: 'running',
      progress: 100,
      status: '',
      statusKind: 'idle',
      exitCode: null,
    });
  });

  onBackendEvent('game:stopped', (payload) => {
    const folderId = payload?.folderId;
    const exitCode = payload?.exitCode ?? -1;
    if (typeof folderId !== 'string') return;

    if (activeLaunchUuid === folderId) activeLaunchUuid = null;
    stopCreep();

    const isClean = exitCode === 0;
    const phase = isClean ? 'exited' : 'crashed';

    setInstance(folderId, {
      phase,
      progress: 0,
      status: isClean
        ? `Game exited (code ${exitCode})`
        : `Game crashed (code ${exitCode})`,
      statusKind: 'idle',
      exitCode,
    });

    const prev = exitTimers.get(folderId);
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => {
      exitTimers.delete(folderId);
      const current = state.instances[folderId];
      if (current?.phase === phase && current?.exitCode === exitCode) {
        clearInstance(folderId);
      }
    }, EXIT_MESSAGE_MS);
    exitTimers.set(folderId, timer);
  });
}

function creep() {
  const diff = currentCeiling - currentValue;
  if (diff > 0) {
    const coeff = diff > 3 ? 0.15 : CREEP_COEFFICIENT;
    const step = Math.max(CREEP_MIN_STEP, diff * coeff);
    currentValue = Math.min(currentCeiling, currentValue + step);
    if (activeLaunchUuid) {
      setInstance(activeLaunchUuid, { progress: currentValue });
    }
  }
}

function startCreep() {
  if (creepInterval) return;
  creepInterval = setInterval(creep, CREEP_INTERVAL_MS);
}

function stopCreep() {
  if (creepInterval) {
    clearInterval(creepInterval);
    creepInterval = null;
  }
}

export function clearError(uuid) {
  const entry = state.instances[uuid];
  if (!entry || entry.phase !== 'error') return;
  clearInstance(uuid);
}

export async function startLaunch(uuid) {
  if (activeLaunchUuid) return;
  const existing = state.instances[uuid];
  if (existing?.phase === 'launching' || existing?.phase === 'running') return;

  stopCreep();

  const prevTimer = exitTimers.get(uuid);
  if (prevTimer) {
    clearTimeout(prevTimer);
    exitTimers.delete(uuid);
  }

  currentValue = 2;
  currentCeiling = 8;
  activeLaunchUuid = uuid;
  lastStatusCommit = 0;

  setInstance(uuid, {
    phase: 'launching',
    progress: 2,
    status: 'Preparing...',
    statusKind: 'progress',
    exitCode: null,
  });

  const startedAt = performance.now();
  startCreep();

  try {
    await StartGame(uuid);
    const elapsed = performance.now() - startedAt;
    const remaining = Math.max(0, MIN_LAUNCH_MS - elapsed);
    if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));

    if (state.instances[uuid]?.phase === 'launching') {
      currentValue = 97;
      setInstance(uuid, { status: 'Starting...', statusKind: 'progress' });
    }
  } catch (e) {
    stopCreep();
    if (activeLaunchUuid === uuid) activeLaunchUuid = null;
    setInstance(uuid, {
      phase: 'error',
      progress: 0,
      status: e?.message ?? String(e),
      statusKind: 'error',
      exitCode: null,
    });
  }
}

installSubs();
