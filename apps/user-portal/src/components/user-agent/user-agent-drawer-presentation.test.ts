import { describe, expect, it } from 'vitest';
import { resolveUserAgentDrawerPresentation } from './user-agent-drawer-presentation';

describe('resolveUserAgentDrawerPresentation', () => {
  it('marks the desktop assistant as non-modal while the page remains interactive', () => {
    expect(resolveUserAgentDrawerPresentation(false)).toEqual({ ariaModal: undefined });
  });

  it('marks the compact assistant as modal while its backdrop is active', () => {
    expect(resolveUserAgentDrawerPresentation(true)).toEqual({ ariaModal: true });
  });
});
