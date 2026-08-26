import type { PageAgentTool } from '@page-agent/core';
import { ProfilePayloadSchema } from '@interview-agent/contracts';
// 必须使用 zod/v4：@page-agent/core 的 PageAgentTool.inputSchema 以 zod/v4 的
// ZodType 定型（其运行时依赖 v4 的 JSON Schema 能力）。仓库其余代码统一用 'zod'（v3 API）；
// zod/v4 的使用仅收敛在本文件与 admin-console 的 admin-agent-tools.ts。
import { z } from 'zod/v4';
import type { NavigationId } from '@/components/shell/navigation';
import { apiRequest } from '@/lib/api';
import { getMasteryProfiles } from '@/lib/practice-api';
import { getPracticeRecommendations, getRecentPractice } from '@/lib/question-catalog-api';

const NAVIGATION_PATHS: Record<NavigationId, string> = {
  home: '/home',
  questions: '/questions',
  learn: '/learn',
  profile: '/profile',
  practice: '/practice',
  interview: '/interview',
  reports: '/reports',
  settings: '/settings',
};
const NAVIGATION_LABELS: Record<NavigationId, string> = {
  home: '首页',
  questions: '自主刷题',
  learn: '学习中心',
  profile: '我的 Agent',
  practice: '练习空间',
  interview: '面试工作台',
  reports: '复盘中心',
  settings: '设置中心',
};
type ToolFactory = <TParams>(options: PageAgentTool<TParams>) => PageAgentTool<TParams>;

export function userAgentNavigationPath(view: NavigationId) {
  return view === 'questions' ? '/questions?source=agent' : NAVIGATION_PATHS[view];
}

export function createUserPageAgentTools(tool: ToolFactory) {
  return {
    navigate_user_view: createNavigationTool(tool),
    get_practice_recommendations: createReadTool(tool, getPracticeRecommendations),
    get_mastery_summary: createReadTool(tool, getMasteryProfiles),
    get_recent_practice: createReadTool(tool, getRecentPractice),
    get_profile_summary: createProfileTool(tool),
  };
}

function createNavigationTool(tool: ToolFactory) {
  return tool({
    description: 'Navigate to an existing user portal view. Never invent a view id.',
    inputSchema: z.object({
      view: z.enum(Object.keys(NAVIGATION_PATHS) as [NavigationId, ...NavigationId[]]),
    }),
    execute: async (input, { signal }) => {
      signal.throwIfAborted();
      window.location.href = userAgentNavigationPath(input.view);
      return `已打开${NAVIGATION_LABELS[input.view]}。`;
    },
  });
}

function createReadTool(tool: ToolFactory, read: () => Promise<unknown>) {
  return tool({
    description: 'Read the current user training data. Read-only.',
    inputSchema: z.object({}),
    execute: async (_input, { signal }) => {
      signal.throwIfAborted();
      return JSON.stringify(await read());
    },
  });
}

function createProfileTool(tool: ToolFactory) {
  return tool({
    description: 'Read a safe summary of the current user profile. Read-only.',
    inputSchema: z.object({}),
    execute: async (_input, { signal }) => {
      signal.throwIfAborted();
      return JSON.stringify(await readProfileSummary());
    },
  });
}

async function readProfileSummary() {
  const payload = await apiRequest({ path: '/profile', schema: ProfilePayloadSchema });
  const profile = payload.profile;
  return {
    targetRole: valueOrNull(profile?.targetRole),
    yearsOfExperience: valueOrNull(profile?.yearsOfExperience),
    currentLevel: valueOrNull(profile?.currentLevel),
    techStacks: listOrEmpty(profile?.techStacks),
    weaknesses: listOrEmpty(payload.snapshot?.weaknesses),
  };
}

function valueOrNull<T>(value: T | null | undefined) {
  return value ?? null;
}

function listOrEmpty<T>(value: T[] | null | undefined) {
  return value ?? [];
}
