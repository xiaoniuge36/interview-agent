'use client';

import { m } from 'motion/react';
import React from 'react';
import type { ReactNode } from 'react';

export function PageMotion({ children }: { children: ReactNode }) {
  return (
    <m.div
      className="route-view route-motion-view"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
    >
      {children}
    </m.div>
  );
}
