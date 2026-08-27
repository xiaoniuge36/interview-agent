import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ROLE_GROUPS } from '@/lib/interview-roles';
import { QuickStartDone, QuickStartGroups, QuickStartRolePicker } from './QuickStartRoles';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe('QuickStartGroups', () => {
  it('渲染全部方向组及组内岗位预览', () => {
    const markup = renderToStaticMarkup(<QuickStartGroups onPick={vi.fn()} />);
    ROLE_GROUPS.forEach(({ group }) => {
      expect(markup).toContain(group);
    });
    expect(markup).toContain('前端开发工程师');
    expect(markup).toContain('产品经理');
  });
});

describe('QuickStartRolePicker', () => {
  it('渲染所选方向组的全部岗位与返回入口', () => {
    const markup = renderToStaticMarkup(
      <QuickStartRolePicker
        group="工程研发"
        creating={false}
        pendingRole=""
        onBack={vi.fn()}
        onPick={vi.fn()}
      />,
    );
    const engineering = ROLE_GROUPS.find((item) => item.group === '工程研发');
    engineering?.roles.forEach((role) => {
      expect(markup).toContain(role.title);
    });
    expect(markup).toContain('换个方向');
  });

  it('创建中的岗位展示进行中文案并禁用按钮', () => {
    const markup = renderToStaticMarkup(
      <QuickStartRolePicker
        group="工程研发"
        creating
        pendingRole="后端开发工程师"
        onBack={vi.fn()}
        onPick={vi.fn()}
      />,
    );
    expect(markup).toContain('正在定制…');
    expect(markup).toContain('disabled');
  });
});

describe('QuickStartDone', () => {
  it('展示已锁定的岗位名称', () => {
    const markup = renderToStaticMarkup(<QuickStartDone role="数据分析师" />);
    expect(markup).toContain('已锁定「数据分析师」方向');
    expect(markup).toContain('备考计划已按这个岗位更新');
  });
});
