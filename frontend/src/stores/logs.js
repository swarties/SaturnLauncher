import { useSyncExternalStore } from 'react';
import { onBackendEvent } from '@/lib/backend';
import { GetInstanceLogs } from '../../wailsjs/go/main/App';

const MAX_LINES = 2000;
const LINE_REGEX = /^\[(\d{2}:\d{2}:\d{2})\] \[([^\]]+)\/([A-Z]+)\]:\s?(.*)$/;

// State:
// {
//   logs: {
//     [uuid]: { lines, loading, error, loaded }
//   }
// }
//
// line: { id, timestamp, thread, level, message }

let state = { logs: {} };
let nextId = 1;
let liveUuid = null;

const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function setLog(uuid, patch) {
  const prev = state.logs[uuid] ?? {
    lines: [],
    loading: false,
    error: null,
    loaded: false,
  };
  setState({
    logs: { ...state.logs, [uuid]: { ...prev, ...patch } },
  });
}

function pushLines(uuid, newLines) {
  const prev = state.logs[uuid] ?? {
    lines: [],
    loading: false,
    error: null,
    loaded: false,
  };

  let combined = [...prev.lines, ...newLines];
  if (combined.length > MAX_LINES) {
    combined = combined.slice(combined.length - MAX_LINES);
  }
  setState({
    logs: { ...state.logs, [uuid]: { ...prev, lines: combined } },
  });
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

export function useLogs() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

function parseLine(raw, id) {
  const match = raw.match(LINE_REGEX);
  if (match)
    return {
      id,
      timestamp: match[1],
      thread: match[2],
      level: match[3],
      message: match[4],
    };

  let level = null;
  if (/warning:/i.test(raw)) level = 'WARN';
  else if (/error:/i.test(raw)) level = 'ERROR';
  return {
    id,
    timestamp: null,
    thread: null,
    level,
    message: raw,
  };
}

let subsInstalled = false;

function installSubs() {
  if (subsInstalled) return;
  subsInstalled = true;

  onBackendEvent('game:started', (folderId) => {
    if (typeof folderId !== 'string') return;
    liveUuid = folderId;
  });

  onBackendEvent('game:stopped', (payload) => {
    const folderId = payload?.folderId;
    if (typeof folderId !== 'string') return;
    if (liveUuid == folderId) liveUuid = null;
  });

  const append = (raw, fallbackLevel) => {
    if (!liveUuid) return;
    if (typeof raw !== 'string') return;

    if (!state.logs[liveUuid]?.loaded) return;
    const parsed = parseLine(raw, nextId++);
    if (fallbackLevel && !parsed.level) parsed.level = fallbackLevel;
    pushLines(liveUuid, [parsed]);
  };

  onBackendEvent('game:info', (line) => append(line, 'INFO'));
  onBackendEvent('game:error', (line) => append(line, 'ERROR'));
}

export function loadLogs(uuid) {
  if (!uuid) return;
  installSubs();

  const existing = state.logs[uuid];
  if (existing?.loaded || existing?.loading) return;

  setLog(uuid, { loading: true, error: null });

  GetInstanceLogs(uuid)
    .then((text) => {
      const raw = typeof text === 'string' ? text : '';
      const rawLines = raw.length
        ? raw.split(/\r?\n/).filter((l) => l.length > 0)
        : [];
      const parsed = rawLines.map((l) => parseLine(l, nextId++));
      const capped =
        parsed.length > MAX_LINES
          ? parsed.slice(parsed.length - MAX_LINES)
          : parsed;
      setLog(uuid, {
        lines: capped,
        loading: false,
        error: null,
        loaded: true,
      });
    })
    .catch((e) => {
      const msg = e?.message ?? String(e);
      const isMissingLog = msg.toLowerCase().includes('no log file exists');
      setLog(uuid, {
        loading: false,
        error: isMissingLog ? null : msg,
        loaded: true,
      });
    });
}
