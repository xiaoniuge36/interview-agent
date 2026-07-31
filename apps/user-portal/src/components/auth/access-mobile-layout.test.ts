import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('removes the supporting story before a 375px sign-in CTA so the form owns the first viewport', () => {
  const stylesheet = readFileSync(resolve('src/app/styles/auth-refinement.css'), 'utf8');

  expect(stylesheet).toMatch(
    /@media\s*\(max-width:\s*520px\)\s*\{[\s\S]*?\.access-story\s*\{[\s\S]*?display:\s*none;/,
  );
  expect(stylesheet).toMatch(/\.access-submit\s*\{[\s\S]*?min-height:\s*50px;/);
});
