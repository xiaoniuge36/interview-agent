import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(new URL('../../app/styles/antd-admin.css', import.meta.url), 'utf8');

describe('account summary layout', () => {
  it('keeps all five account metrics in one desktop row and falls back to two columns on narrow screens', () => {
    expect(styles).toMatch(
      /\.account-summary \{[\s\S]*?grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);/,
    );
    expect(styles).toMatch(
      /@media \(max-width: 768px\) \{[\s\S]*?\.account-summary \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
  });
});
