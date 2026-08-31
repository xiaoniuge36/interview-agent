import type { Dashboard } from '@interview-agent/contracts';
import type { AdminView } from '@/components/admin-navigation';

const FULL_SCHEMA_PASS_RATE = 100;

export type AdminAttentionItem = {
  id: 'review-backlog' | 'failed-imports' | 'runtime-risk' | 'schema-pass-rate';
  count: number;
  description: string;
  severity: 'warning' | 'error';
  title: string;
  view: AdminView;
};

export function getAdminAttentionItems(dashboard: Dashboard): AdminAttentionItem[] {
  return [
    reviewBacklog(dashboard),
    failedImports(dashboard),
    runtimeRisk(dashboard),
    schemaRisk(dashboard),
  ].filter((item): item is AdminAttentionItem => item !== null);
}

function reviewBacklog(dashboard: Dashboard): AdminAttentionItem | null {
  const count = dashboard.stats.pendingCandidates;
  return count
    ? {
        id: 'review-backlog',
        count,
        description: '候选题仍在审核队列中，建议优先处理以保持训练内容供给。',
        severity: 'warning',
        title: '候选题待审核',
        view: 'content',
      }
    : null;
}

function failedImports(dashboard: Dashboard): AdminAttentionItem | null {
  const count = dashboard.importPipeline.find((item) => item.stage === 'failed')?.count ?? 0;
  return count
    ? {
        id: 'failed-imports',
        count,
        description: '导入任务失败，需要确认来源内容或处理记录。',
        severity: 'error',
        title: '导入任务失败',
        view: 'imports',
      }
    : null;
}

function runtimeRisk(dashboard: Dashboard): AdminAttentionItem | null {
  const count = dashboard.recentRuns.filter(
    (run) => run.status === 'failed' || run.status === 'fallback',
  ).length;
  return count
    ? {
        id: 'runtime-risk',
        count,
        description: '近期运行出现失败或降级，建议检查 Trace 和模型路由。',
        severity: 'error',
        title: 'Agent 运行风险',
        view: 'runtime',
      }
    : null;
}

function schemaRisk(dashboard: Dashboard): AdminAttentionItem | null {
  const count = dashboard.stats.schemaPassRate;
  return count < FULL_SCHEMA_PASS_RATE
    ? {
        id: 'schema-pass-rate',
        count,
        description: '结构校验通过率未达到 100%，请复核题目结构与导入规则。',
        severity: 'warning',
        title: '结构校验通过率待提升',
        view: 'questions',
      }
    : null;
}
