import { Logout, StartApp, StartLogin } from '../../wailsjs/go/main/App';
import {
  BrowserOpenURL,
  EventsOn,
  EventsOff,
  ClipboardSetText,
  OnFileDrop,
} from '../../wailsjs/runtime/runtime';

const isWails =
  typeof window !== 'undefined' && typeof window.go !== 'undefined';

export function startApp() {
  if (!isWails) {
    console.warn("Saturn isn't running inside Wails. StartApp was skipped");
    return;
  }
  return StartApp();
}

export function startLogin() {
  if (!isWails) {
    console.warn("Saturn isn't running inside Wails. StartLogin was skipped");
    return;
  }
  return StartLogin();
}

export function logout() {
  if (!isWails) {
    console.warn("Saturn isn't running inside Wails. Logout was skipped");
    return;
  }
  return Logout();
}

const eventListeners = new Map();

export function onBackendEvent(eventName, callback) {
  if (!isWails) {
    console.warn(
      `Saturn isn't running inside Wails. Cannot listen to '${eventName}'.`
    );
    return () => {};
  }

  if (!eventListeners.has(eventName)) {
    eventListeners.set(eventName, new Set());
    EventsOn(eventName, (...args) => {
      eventListeners.get(eventName)?.forEach((cb) => cb(...args));
    });
  }

  const listenersForEvent = eventListeners.get(eventName);
  listenersForEvent.add(callback);

  return () => {
    listenersForEvent.delete(callback);
    if (listenersForEvent.size === 0) {
      eventListeners.delete(eventName);
      EventsOff(eventName);
    }
  };
}

let isFileDropInstalled = false;
const fileDropListeners = new Set();

export function onFileDrop(callback) {
  if (!isWails) return () => {};

  fileDropListeners.add(callback);

  if (!isFileDropInstalled) {
    isFileDropInstalled = true;
    OnFileDrop((x, y, paths) => {
      fileDropListeners.forEach((cb) => cb(x, y, paths));
    }, true);
  }

  return () => {
    fileDropListeners.delete(callback);
  };
}

export function openExternalURL(url) {
  if (!url) return;

  if (isWails) {
    BrowserOpenURL(url);
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function copyText(text) {
  if (!text) return false;

  if (isWails) {
    try {
      return await ClipboardSetText(text);
    } catch (error) {
      console.warn('Could not write to the native clipboard: ', error);
      return false;
    }
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.warn('Could not write to the browser clipboard: ', error);
    return false;
  }
}
