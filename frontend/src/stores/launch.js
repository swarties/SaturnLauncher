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
const SPRINT_COEFFICIENT = 0.08;
const SPRINT_MIN_STEP = 0.5;
const SUCCESS_HOLD_MS = 200;
const STATUS_CLEAR_MS = 5000;
const MIN_LAUNCH_MS = 2200;

let state = {
  activeUuid: null,
  isLoading: false,
  progress: 0,
  status: '',
  statusKind: 'idle', // 'idle' | 'progress' | 'success' | 'error'
};

let currentValue = 0;
let currentCeiling = 0;
let creepInterval = null;
let successTimer = null;
let statusTimer = null;
let fadeTriggered = false;

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

export function useLaunch() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

let subsInstalled = false;

const MIN_STATUS_MS = 250;
let lastStatusCommit = 0;

function installSubs() {
  if (subsInstalled) return;
  subsInstalled = true;

  onBackendEvent('download:progress', (msg) => {
    if (typeof msg !== 'string') return;

    const ceil = STEP_CEILINGS[msg];
    if (typeof ceil === 'number' && ceil > currentCeiling) {
      currentCeiling = ceil;
    }
    if (msg === 'Done!') return;

    // Warm-cache throttling: collapse rapid-fire labels.
    const now = performance.now();
    if (now - lastStatusCommit >= MIN_STATUS_MS) {
      lastStatusCommit = now;
      setState({ status: msg, statusKind: 'progress' });
    }
  });
}

function creep() {
  const diff = currentCeiling - currentValue;
  if (diff > 0) {
    let step;
    if (state.statusKind === 'success') {
      step = Math.max(SPRINT_MIN_STEP, diff * SPRINT_COEFFICIENT);
    } else {
      const coeff = diff > 3 ? 0.15 : CREEP_COEFFICIENT;
      step = Math.max(CREEP_MIN_STEP, diff * coeff);
    }
    currentValue = Math.min(currentCeiling, currentValue + step);
    setState({ progress: currentValue });
  }

  if (state.statusKind === 'success' && currentValue >= 100 && !fadeTriggered) {
    fadeTriggered = true;
    successTimer = setTimeout(() => {
      stopCreep();
      setState({
        activeUuid: null,
        isLoading: false,
        progress: 0,
        status: '',
        statusKind: 'idle',
      });
      successTimer = null;
      fadeTriggered = false;
    }, SUCCESS_HOLD_MS);
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

function clearTimers() {
  if (successTimer) {
    clearTimeout(successTimer);
    successTimer = null;
  }
  if (statusTimer) {
    clearTimeout(statusTimer);
    statusTimer = null;
  }
}

export async function startLaunch(uuid) {
  if (state.isLoading) return;

  installSubs();
  clearTimers();
  stopCreep();

  fadeTriggered = false;
  currentValue = 2;
  currentCeiling = 8;

  setState({
    activeUuid: uuid,
    isLoading: true,
    progress: 2,
    status: 'Preparing...',
    statusKind: 'progress',
  });

  const startedAt = performance.now();

  startCreep();

  try {
    await StartGame(uuid);
    const elapsed = performance.now() - startedAt;
    const remaining = Math.max(0, MIN_LAUNCH_MS - elapsed);
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, remaining));
    }

    currentCeiling = 100;
    setState({ status: 'Game launched!', statusKind: 'success' });
    //   creep() sees statusKind is success so sprint to 100
  } catch (e) {
    stopCreep();
    setState({
      activeUuid: null,
      isLoading: false,
      progress: 0,
      status: e?.message ?? String(e),
      statusKind: 'error',
    });
    statusTimer = setTimeout(() => {
      setState({ status: '', statusKind: 'idle' });
      statusTimer = null;
    }, STATUS_CLEAR_MS);
  }
}
