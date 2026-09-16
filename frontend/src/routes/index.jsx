import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import App from '../App';

export const Route = createFileRoute('/')({
  component: App,
});
