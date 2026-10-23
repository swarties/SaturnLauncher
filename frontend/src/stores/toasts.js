import { useSyncExternalStore } from 'react';

let state = { toasts: [] };
let nextId = 1;
const listeners = new Set();
const timers = new Map();

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
  setState({ toasts: [...state.toasts, newToast] });

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
  setState({ toast: state.toasts.filter((t) => t.id !== id) });
}

export const toast = {
  success: (message, opts) => addToast({ message, type: 'success', ...opts }),
  error: (message, opts) => addToast({ message, type: 'error', ...opts }),
  info: (message, opts) => addToast({ message, type: 'info', ...opts }),
};
