import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AccountManagement } from './AccountManagement';
import { roleOption } from './account-management.types';

describe('AccountManagement', () => {
  it('uses a compact governance toolbar in the existing console', () => {
    const markup = renderToStaticMarkup(
      createElement(AccountManagement, {
        active: false,
        refreshKey: 0,
        onChanged: () => undefined,
      }),
    );

    expect(markup).toContain('账号管理');
    expect(markup).toContain('搜索账号');
    expect(markup).toContain('高级筛选');
    expect(markup).toContain('新增管理员');
    expect(markup).toContain('查询');
    expect(markup).toContain('导出');
  });

  it('uses complete role labels and descriptions for role changes', () => {
    expect(roleOption('question_reviewer')).toMatchObject({
      label: '内容审核员',
      description: '处理导入资料与候选题审核。',
    });
  });
});
