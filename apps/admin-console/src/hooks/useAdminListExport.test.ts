import { describe, expect, it } from 'vitest';
import { adminExportSuccessMessage } from './useAdminListExport';

describe('adminExportSuccessMessage', () => {
  it('reminds operators to wait and keep the page open for large exports', () => {
    const text = adminExportSuccessMessage('candidates-20260831.csv');

    expect(text).toContain('已开始导出 candidates-20260831.csv');
    expect(text).toContain('数据量较大时请稍候，勿关闭页面');
  });
});
