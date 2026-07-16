import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AccountManagement } from './AccountManagement';

describe('AccountManagement', () => {
  it('uses the traditional management toolbar and keeps platform operations in the existing console', () => {
    const markup = renderToStaticMarkup(
      createElement(AccountManagement, {
        active: false,
        refreshKey: 0,
        onChanged: () => undefined,
      }),
    );

    expect(markup).toContain('账号管理');
    expect(markup).toContain('租户');
    expect(markup).toContain('查询');
    expect(markup).toContain('重置');
    expect(markup).toContain('导出');
  });
});
