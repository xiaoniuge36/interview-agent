import type { PageAgentTool } from '@page-agent/core';
import { ProfilePayloadSchema } from '@interview-agent/contracts';
import { z } from 'zod/v4';
import { getMasteryProfiles } from '@/lib/practice-api';
import { getPracticeRecommendations, getRecentPractice } from '@/lib/question-catalog-api';
import type { NavigationId } from '@/components/shell/navigation';
import { apiRequest } from '@/lib/api';

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
  interview: '面试工作室',
  reports: '复盘中心',
  settings: '设置中心',
};
type ToolFactory = <TParams>(options: PageAgentTool<TParams>) => PageAgentTool<TParams>;

export function createUserPageAgentTools(tool: ToolFactory) {
  return {
    navigate_user_view: tool({
      description: 'Navigate to an existing user portal view. Never invent a view id.',
      inputSchema: z.object({
        view: z.enum(Object.keys(NAVIGATION_PATHS) as [NavigationId, ...NavigationId[]]),
      }),
      execute: async (input, { signal }) => {
        signal.throwIfAborted();
        window.location.href = NAVIGATION_PATHS[input.view];
        return `已打开${NAVIGATION_LABELS[input.view]}。`;
      },
    }),
    get_practice_recommendations: tool({
      description: 'Read the current user practice recommendations. Read-only.',
      inputSchema: z.object({}),
      execute: async (_input, { signal }) => {
        signal.throwIfAborted();
        return JSON.stringify(await getPracticeRecommendations());
      },
    }),
    get_mastery_summary: tool({
      description: 'Read the current user mastery scores. Read-only.',
      inputSchema: z.object({}),
      execute: async (_input, { signal }) => {
        signal.throwIfAborted();
        return JSON.stringify(await getMasteryProfiles());
      },
    }),
    get_recent_practice: tool({
      description: 'Read the current user recent practice summary. Read-only.',
      inputSchema: z.object({}),
      execute: async (_input, { signal }) => {
        signal.throwIfAborted();
        return JSON.stringify(await getRecentPractice());
      },
    }),
    get_profile_summary: tool({
      description: 'Read a safe summary of the current user profile. Read-only.',
      inputSchema: z.object({}),
      execute: async (_input, { signal }) => {
        signal.throwIfAborted();
        const payload = await apiRequest({ path: '/profile', schema: ProfilePayloadSchema });
        const profile = payload.profile;
        return JSON.stringify({
          targetRole: profile?.targetRole ?? null,
          yearsOfExperience: profile?.yearsOfExperience ?? null,
          currentLevel: profile?.currentLevel ?? null,
          techStacks: profile?.techStacks ?? [],
          weaknesses: payload.snapshot?.weaknesses ?? [],
        });
      },
    }),
  };
}
