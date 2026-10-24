import { useSyncExternalStore } from 'react';

let state = { toasts: [] };
let nextId = 1;
const listeners = new Set();
const timers = new Map();

const TOAST_HEIGHT_ESTIMATION = 80;
const MAX_VIEWPORT_FRACTION = 0.9;

function getMaxToasts() {
  if (typeof window === 'undefined') return 5;
  return Math.max(
    2,
    Math.floor(
      (window.innerHeight * MAX_VIEWPORT_FRACTION) / TOAST_HEIGHT_ESTIMATION
    )
  );
}

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

export function useToasts() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

function addToast({
  message,
  type = 'info',
  duration = 3000,
  dismissible = true,
}) {
  const id = nextId++;
  const newToast = { id, message, type, duration, dismissible };

  const maxToasts = getMaxToasts();
  let currentToasts = state.toasts;

  while (currentToasts.length >= maxToasts) {
    const oldest = currentToasts[0];
    if (timers.has(oldest.id)) {
      clearTimeout(timers.get(oldest.id));
      timers.delete(oldest.id);
    }
    currentToasts = currentToasts.slice(1);
  }

  setState({ toasts: [...currentToasts, newToast] });

  if (duration > 0) {
    const timer = setTimeout(() => removeToast(id), duration);
    timers.set(id, timer);
  }
}

export function removeToast(id) {
  if (timers.has(id)) {
    clearTimeout(timers.get(id));
    timers.delete(id);
  }
  setState({ toasts: state.toasts.filter((t) => t.id !== id) });
}

export const toast = {
  success: (message, opts) => addToast({ message, type: 'success', ...opts }),
  error: (message, opts) => addToast({ message, type: 'error', ...opts }),
  info: (message, opts) => addToast({ message, type: 'info', ...opts }),
};
