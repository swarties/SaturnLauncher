import { Gamepad2, Home, Settings, User } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/instances', label: 'Instances', icon: Gamepad2 },
  { to: '/account', label: 'Account', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
];
