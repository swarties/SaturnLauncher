import { StartApp, StartLogin } from '../../wailsjs/go/main/App';
import {
  BrowserOpenURL,
  EventsOn,
  EventsOff,
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

export function onBackendEvent(eventName, callback) {
  if (!isWails) {
    console.warn(
      `Saturn isn't running inside Wails. Cannot listen to '${eventName}'.`
    );
    return () => {};
  }

  EventsOn(eventName, callback);
  return () => {
    EventsOff(eventName);
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
