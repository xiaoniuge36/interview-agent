import { describe, expect, it } from 'vitest';
import { profileFormFrom } from './profile-form';

describe('profileFormFrom', () => {
  it('keeps a first-time profile blank instead of inventing candidate evidence', () => {
    expect(profileFormFrom({ profile: null, snapshot: null })).toEqual({
      targetRole: '',
      yearsOfExperience: 0,
      techStacks: '',
      resumeSummary: '',
      projectExperiences: '',
      currentLevel: '',
    });
  });
});
