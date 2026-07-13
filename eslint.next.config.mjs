import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import sharedConfig from './eslint.config.mjs';

export function createNextConfig(baseDirectory) {
  const compatibility = new FlatCompat({
    baseDirectory,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
  });

  return [
    ...sharedConfig,
    ...compatibility.extends('next/core-web-vitals'),
    {
      settings: {
        next: { rootDir: baseDirectory },
      },
    },
    prettier,
  ];
}
