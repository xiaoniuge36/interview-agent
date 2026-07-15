import { describe, expect, it } from 'vitest';
import { canAccessConsole } from './AdminAccess';

describe('canAccessConsole', () => {
  it('allows the two management roles', () => {
    expect(canAccessConsole('admin')).toBe(true);
    expect(canAccessConsole('question_reviewer')).toBe(true);
  });

  it('denies regular and missing roles', () => {
    expect(canAccessConsole('candidate')).toBe(false);
    expect(canAccessConsole('user')).toBe(false);
    expect(canAccessConsole(undefined)).toBe(false);
  });
});
