import { describe, expect, it } from 'vitest';
import { resolveAgentDrawerPresentation } from './agent-drawer-presentation';

describe('resolveAgentDrawerPresentation', () => {
  it('keeps the desktop agent panel non-modal so the workspace remains interactive', () => {
    expect(resolveAgentDrawerPresentation(false)).toEqual({ mask: false, maskClosable: false });
  });

  it('keeps the compact agent panel modal to prevent accidental background actions', () => {
    expect(resolveAgentDrawerPresentation(true)).toEqual({ mask: true, maskClosable: true });
  });
});
