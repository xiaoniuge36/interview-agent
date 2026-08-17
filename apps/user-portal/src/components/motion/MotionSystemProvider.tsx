'use client';

import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import type { ReactNode } from 'react';
import { useThemePreferences } from '@/components/theme/ThemePreferencesProvider';

const MOTION_EASE_START = 0.22;
const MOTION_EASE_END = 0.36;
const MOTION_EASE = [MOTION_EASE_START, 1, MOTION_EASE_END, 1] as const;

export function MotionSystemProvider({ children }: { children: ReactNode }) {
  const { preferences } = useThemePreferences();

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig
        reducedMotion={preferences.motion ? 'user' : 'always'}
        transition={{ duration: 0.24, ease: MOTION_EASE }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
