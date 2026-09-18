import { useSyncExternalStore } from 'react';

let state = {
  status: 'unknown', // 'unknown', 'authenticated', 'unauthenticated'
  profile: null, // {name, id}
  userCode: null,
  verificationUri: null,
  error: null,
};

const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getAuthState = () => state;

export function useAuth() {
  return useSyncExternalStore(subscribe, getAuthState);
}

export const authActions = {
  clearError: () => setState({ error: null }),

  loginCode: (p) =>
    setState({
      userCode: p?.userCode ?? p?.user_code,
      verificationUri: p?.verificationUri ?? p?.verification_uri,
    }),

  loginSuccess: (profile) =>
    setState({
      status: 'authenticated',
      profile,
      userCode: null,
      verificationUri: null,
      error: null,
    }),

  loginError: (message) =>
    setState({
      error: message,
      userCode: null,
      verificationUri: null,
    }),

  authSuccess: (profile) =>
    setState(
      profile
        ? { status: 'authenticated', profile }
        : { status: 'unauthenticated' }
    ),

  authRequired: () => setState({ status: 'unauthenticated' }),
};
