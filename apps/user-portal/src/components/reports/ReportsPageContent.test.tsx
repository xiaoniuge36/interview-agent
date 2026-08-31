import { describe, expect, it } from 'vitest';
import { archiveLoadPhase } from './ReportsPageContent';

describe('archiveLoadPhase', () => {
  it('首次加载没有旧记录时才整块显示加载占位', () => {
    expect(archiveLoadPhase('loading', 0)).toBe('initial-loading');
  });

  it('重新读取时已有旧记录则保留列表并进入刷新态', () => {
    expect(archiveLoadPhase('loading', 6)).toBe('refreshing');
  });

  it('ready 与 partial 都按就绪渲染列表', () => {
    expect(archiveLoadPhase('ready', 3)).toBe('ready');
    expect(archiveLoadPhase('partial', 3)).toBe('ready');
  });

  it('读取失败渲染错误态', () => {
    expect(archiveLoadPhase('error', 0)).toBe('error');
  });
});
