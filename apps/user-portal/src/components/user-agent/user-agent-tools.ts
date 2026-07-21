import type { PageAgentTool } from '@page-agent/core';
import { ProfilePayloadSchema } from '@interview-agent/contracts';
import { z } from 'zod/v4';
import type { NavigationId } from '@/components/shell/navigation';
import { apiRequest } from '@/lib/api';
import { getMasteryProfiles } from '@/lib/practice-api';
import { getPracticeRecommendations, getRecentPractice } from '@/lib/question-catalog-api';

const NAVIGATION_PATHS: Record<NavigationId, string> = {
  home: '/home',
  questions: '/questions',
  profile: '/profile',
  practice: '/practice',
  interview: '/interview',
  reports: '/reports',
  settings: '/settings',
};
const NAVIGATION_LABELS: Record<NavigationId, string> = {
  home: '首页',
  questions: '自主刷题',
  profile: '我的 Agent',
  practice: '练习空间',
  interview: '面试工作台',
  reports: '复盘中心',
  settings: '设置中心',
};
type ToolFactory = <TParams>(options: PageAgentTool<TParams>) => PageAgentTool<TParams>;

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
      window.location.href = NAVIGATION_PATHS[input.view];
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
