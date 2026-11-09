import { useEffect, useState } from 'react';
import { getCachedImage, setCachedImage } from '@/lib/image-cache';

const TTL = 60 * 60 * 1000;

export function CachedImage({ src, ...props }) {
  const [localSrc, setLocalSrc] = useState(null);

  useEffect(() => {
    let active = true;
    let currentObjectUrl = null;

    async function load() {
      const cached = await getCachedImage(src);
      const now = Date.now();

      if (cached) {
        if (active) {
          currentObjectUrl = URL.createObjectURL(cached.blob);
          setLocalSrc(currentObjectUrl);
        }

        if (!navigator.onLine) return;
        if (now - cached.timestamp < TTL) return;
      } else {
        if (!navigator.onLine) return;
      }

      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error('Fetch failed');
        const blob = await res.blob();
        await setCachedImage(src, blob);

        if (active) {
          if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
          currentObjectUrl = URL.createObjectURL(blob);
          setLocalSrc(currentObjectUrl);
        }
      } catch {}
    }
    load();

    return () => {
      active = false;
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    };
  }, [src]);

  return <img src={localSrc || src} {...props} />;
}
