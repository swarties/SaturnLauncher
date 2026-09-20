const KEY = 'saturn.onboarded';

export const hasOnboarded = () => localStorage.getItem(KEY) === 'true';
export const setOnboarded = () => localStorage.setItem(KEY, 'true');
