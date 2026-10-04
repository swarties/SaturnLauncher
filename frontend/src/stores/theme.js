import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'saturn.theme';
const DEFAULT_THEME_ID = 'dark';

/**
 * Theme registry. To add a theme:
 *   1. Add an entry here with a unique `id` matching the CSS class name.
 *   2. Add a `.yourid { ... }` block to style.css.
 *   3. Add the id to the `themeClasses` array in index.html's inline script.
 *
 * @typedef {{ id: string, label: string, description?: string, className: string }} Theme
 */

/** @type {Theme[]} */
export const THEMES = [
  {
    id: 'dark',
    label: 'Dark',
    description: 'Deep space purple',
    className: 'dark',
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Daylight purple',
    className: 'light',
  },
];

function getTheme(id) {
  return (
    THEMES.find((t) => t.id === id) ??
    THEMES.find((t) => t.id === DEFAULT_THEME_ID)
  );
}

function applyThemeClass(id) {
  if (typeof document === 'undefined') return;
  const theme = getTheme(id);
  const allClasses = THEMES.map((t) => t.className);
  document.documentElement.classList.remove(...allClasses);
  document.documentElement.classList.add(theme.className);
}

let currentID = DEFAULT_THEME_ID;
const listeners = new Set();

export function initTheme() {
  if (typeof window === 'undefined') return;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  currentID = getTheme(stored).id;
  applyThemeClass(currentID);
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => currentID;

export function useTheme() {
  const id = useSyncExternalStore(subscribe, getSnapshot);
  return { id, theme: getTheme(id) };
}

export function setTheme(id) {
  const theme = getTheme(id);
  currentID = theme.id;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme.id);
  } catch {
    // ..
  }
  applyThemeClass(theme.id);
  listeners.forEach((l) => l());
}
