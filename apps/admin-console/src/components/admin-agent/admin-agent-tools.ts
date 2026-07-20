import type { PageAgentTool } from '@page-agent/core';
import { DashboardSchema } from '@interview-agent/contracts';
import { z } from 'zod/v4';
import type { AdminView } from '@/components/admin-navigation';
import { adminRequest } from '@/lib/api';
import { queryAdminList } from '@/lib/admin-list-api';
import { getPlatformAiAnalytics } from '@/lib/platform-api';

const ADMIN_VIEWS = [
  'overview',
  'analytics',
  'imports',
  'questions',
  'content',
  'models',
  'runtime',
  'audit',
  'accounts',
] as const;
const IMPORT_TASK_ID_MAX_LENGTH = 160;
const DEFAULT_TOOL_LIMIT = 10;
const MAX_TOOL_LIMIT = 20;
const LimitSchema = z.object({
  limit: z.number().int().min(1).max(MAX_TOOL_LIMIT).default(DEFAULT_TOOL_LIMIT),
});
type ToolFactory = <TParams>(options: PageAgentTool<TParams>) => PageAgentTool<TParams>;

export function createAdminPageAgentTools(tool: ToolFactory, role: string | undefined) {
  return {
    ...navigationTools(tool),
    ...contentTools(tool),
    ...runtimeTools(tool),
    get_admin_dashboard: dashboardTool(tool),
    ...(role === 'platform_admin' ? { get_ai_usage_summary: usageTool(tool) } : {}),
  };
}

function navigationTools(tool: ToolFactory) {
  return {
    navigate_admin_view: tool({
      description: 'Navigate to an existing admin console view. Never invent a view id.',
      inputSchema: z.object({
        view: z.enum(ADMIN_VIEWS),
        importTaskId: z.string().trim().min(1).max(IMPORT_TASK_ID_MAX_LENGTH).optional(),
      }),
      execute: async (input, { signal }) => {
        signal.throwIfAborted();
        window.location.hash = input.importTaskId
          ? `#content?importTaskId=${encodeURIComponent(input.importTaskId)}`
          : `#${input.view}`;
        return `已打开${viewLabel(input.view as AdminView)}。`;
      },
    }),
    refresh_admin_data: tool({
      description: 'Refresh the current admin data after a user asks to sync or reload.',
      inputSchema: z.object({}),
      execute: async (_input, { signal }) => {
        signal.throwIfAborted();
        window.dispatchEvent(new Event('admin-agent-refresh'));
        return '已触发当前后台数据刷新。';
      },
    }),
  };
}

function contentTools(tool: ToolFactory) {
  return {
    find_pending_imports: tool({
      description: 'Find import batches waiting for review. Read-only; returns ids and progress.',
      inputSchema: LimitSchema,
      execute: async (input, { signal }) => {
        const result = await queryAdminList(
          'imports',
          { status: 'review', page: 1, pageSize: input.limit },
          signal,
        );
        return JSON.stringify({
          total: result.total,
          items: result.items.map((item) => ({
            id: item.id,
            title: item.title,
            candidateCount: item.candidateCount,
            candidateReviewProgress: item.candidateReviewProgress,
            updatedAt: item.updatedAt,
          })),
        });
      },
    }),
    find_pending_candidates: tool({
      description:
        'Find candidate questions waiting for review. Read-only; includes source import id.',
      inputSchema: LimitSchema,
      execute: async (input, { signal }) => {
        const result = await queryAdminList(
          'candidates',
          { status: 'pending', page: 1, pageSize: input.limit },
          signal,
        );
        return JSON.stringify({
          total: result.total,
          items: result.items.map((item) => ({
            id: item.id,
            title: item.title,
            importTaskId: item.importTaskId,
            qualityScore: item.qualityScore,
            createdAt: item.createdAt,
          })),
        });
      },
    }),
  };
}

function runtimeTools(tool: ToolFactory) {
  return {
    get_runtime_failures: tool({
      description: 'Summarize recent failed and fallback Agent runtime runs. Read-only.',
      inputSchema: LimitSchema,
      execute: async (input, { signal }) => {
        const [failed, fallback] = await Promise.all([
          queryAdminList(
            'agent-runs',
            { status: 'failed', page: 1, pageSize: input.limit },
            signal,
          ),
          queryAdminList(
            'agent-runs',
            { status: 'fallback', page: 1, pageSize: input.limit },
            signal,
          ),
        ]);
        return JSON.stringify({
          failed: summarizeRuns(failed.items),
          fallback: summarizeRuns(fallback.items),
        });
      },
    }),
  };
}

function dashboardTool(tool: ToolFactory) {
  return tool({
    description: 'Read the current tenant admin dashboard metrics. Read-only.',
    inputSchema: z.object({}),
    execute: async (_input, { signal }) => {
      const dashboard = await adminRequest({
        path: '/admin/dashboard',
        schema: DashboardSchema,
        init: { signal },
      });
      return JSON.stringify(dashboard);
    },
  });
}

function usageTool(tool: ToolFactory) {
  return tool({
    description: 'Read the platform AI usage summary, including model and token totals. Read-only.',
    inputSchema: z.object({ period: z.enum(['today', '7d', '30d']).default('7d') }),
    execute: async (input, { signal }) => {
      const analytics = await getPlatformAiAnalytics(
        { period: input.period, operation: 'admin_page_agent' },
        signal,
      );
      return JSON.stringify(analytics);
    },
  });
}

function summarizeRuns(
  items: Array<{
    id: string;
    status: string;
    type: string;
    stage: string;
    traceId: string;
    latencyMs: number | null;
    fallbackUsed: boolean;
    updatedAt: string;
    modelUsage: { provider: string; model: string; totalTokens: number | null } | null;
  }>,
) {
  return items.map((item) => ({
    id: item.id,
    status: item.status,
    type: item.type,
    stage: item.stage,
    traceId: item.traceId,
    latencyMs: item.latencyMs,
    fallbackUsed: item.fallbackUsed,
    updatedAt: item.updatedAt,
    modelUsage: item.modelUsage,
  }));
}

function viewLabel(view: AdminView): string {
  const labels: Record<AdminView, string> = {
    overview: '治理总览',
    analytics: '数据看板',
    imports: '资料导入',
    questions: '题库管理',
    content: '审核工作台',
    models: '模型治理',
    runtime: '运行观测',
    audit: '审计日志',
    accounts: '账号管理',
  };
  return labels[view];
}
