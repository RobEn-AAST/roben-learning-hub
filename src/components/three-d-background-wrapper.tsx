'use client';

import dynamic from 'next/dynamic';

// Dynamic import Three.js — ~36MB loaded lazily, only on desktop
const ThreeDBackground = dynamic(
  () => import('@/components/3d-elements').then(m => ({ default: m.ThreeDBackground })),
  { ssr: false, loading: () => null }
);

export function ThreeDBackgroundWrapper() {
  return <ThreeDBackground />;
}
