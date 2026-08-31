import type { PageAgentTool } from '@page-agent/core';
import { ProfilePayloadSchema } from '@interview-agent/contracts';
// 必须使用 zod/v4：@page-agent/core 的 PageAgentTool.inputSchema 以 zod/v4 的
// ZodType 定型（其运行时依赖 v4 的 JSON Schema 能力）。仓库其余代码统一用 'zod'（v3 API）；
// zod/v4 的使用仅收敛在本文件与 admin-console 的 admin-agent-tools.ts。
import { z } from 'zod/v4';
import { NAV_ITEMS, navItemById, type NavigationId } from '@/components/shell/navigation';
import { apiRequest } from '@/lib/api';
import { getMasteryProfiles } from '@/lib/practice-api';
import { getPracticeRecommendations, getRecentPractice } from '@/lib/question-catalog-api';

// 路径与叫法直接复用 NAV_ITEMS：Agent 回话里的页面名必须与壳层导航一字不差
const NAVIGATION_IDS = NAV_ITEMS.map((item) => item.id) as [NavigationId, ...NavigationId[]];
type ToolFactory = <TParams>(options: PageAgentTool<TParams>) => PageAgentTool<TParams>;

export function userAgentNavigationPath(view: NavigationId) {
  return view === 'questions' ? '/questions?source=agent' : navItemById(view).href;
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
      view: z.enum(NAVIGATION_IDS),
    }),
    execute: async (input, { signal }) => {
      signal.throwIfAborted();
      window.location.href = userAgentNavigationPath(input.view);
      return `已打开${navItemById(input.view).label}。`;
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
