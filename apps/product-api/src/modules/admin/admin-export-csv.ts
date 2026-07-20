import type {
  AccountView,
  AgentRunDetailView,
  AuditLogView,
  CandidateReview,
  ImportTask,
  ModelProfile,
  Question,
} from '@interview-agent/contracts';
import { renderCsv, type CsvColumn } from './admin-csv';

export function renderImportTaskExportCsv(rows: ImportTask[]): string {
  return renderCsv(importTaskColumns, rows);
}

export function renderQuestionExportCsv(rows: Question[]): string {
  return renderCsv(questionColumns, rows);
}

export function renderCandidateExportCsv(rows: CandidateReview[]): string {
  return renderCsv(candidateColumns, rows);
}

export function renderModelProfileExportCsv(rows: ModelProfile[]): string {
  return renderCsv(modelProfileColumns, rows);
}

export function renderAgentRunExportCsv(rows: AgentRunDetailView[]): string {
  return renderCsv(agentRunColumns, rows);
}

export function renderAuditLogExportCsv(rows: AuditLogView[]): string {
  return renderCsv(auditLogColumns, rows);
}

export function renderAccountExportCsv(rows: AccountView[]): string {
  return renderCsv(accountColumns, rows);
}

const importTaskColumns: readonly CsvColumn<ImportTask>[] = [
  { header: '任务 ID', value: (task) => task.id },
  { header: '任务名称', value: (task) => task.title },
  { header: '状态', value: (task) => task.status },
  { header: '候选题数', value: (task) => task.candidateCount },
  { header: '待审核', value: (task) => task.candidateReviewProgress.pending },
  { header: '需修改', value: (task) => task.candidateReviewProgress.needsEdit },
  { header: '已通过', value: (task) => task.candidateReviewProgress.approved },
  { header: '已驳回', value: (task) => task.candidateReviewProgress.rejected },
  { header: '已发布', value: (task) => task.candidateReviewProgress.published },
  { header: '创建时间', value: (task) => task.createdAt },
  { header: '更新时间', value: (task) => task.updatedAt },
  { header: '失败原因', value: (task) => task.failureReason },
];

const questionColumns: readonly CsvColumn<Question>[] = [
  { header: '题目 ID', value: (question) => question.id },
  { header: '题目', value: (question) => question.title },
  { header: '题型', value: (question) => question.type },
  { header: '难度', value: (question) => question.difficulty },
  { header: '可见范围', value: (question) => question.visibility },
  { header: '状态', value: (question) => question.status },
];

const candidateColumns: readonly CsvColumn<CandidateReview>[] = [
  { header: '候选题 ID', value: (candidate) => candidate.id },
  { header: '导入任务 ID', value: (candidate) => candidate.importTaskId },
  { header: '题目', value: (candidate) => candidate.title },
  { header: '状态', value: (candidate) => candidate.status },
  { header: '质量分', value: (candidate) => candidate.qualityScore },
  { header: '标签', value: (candidate) => candidate.tags.join(' / ') },
  { header: '创建时间', value: (candidate) => candidate.createdAt },
];

const modelProfileColumns: readonly CsvColumn<ModelProfile>[] = [
  { header: '配置 ID', value: (model) => model.id },
  { header: '提供方', value: (model) => model.provider },
  { header: '模型', value: (model) => model.model },
  { header: '用途', value: (model) => model.purpose },
  { header: '状态', value: (model) => model.status },
  { header: '预算', value: (model) => model.budget },
  { header: 'Schema 模式', value: (model) => model.schemaMode },
  { header: '更新时间', value: (model) => model.updatedAt },
];

const agentRunColumns: readonly CsvColumn<AgentRunDetailView>[] = [
  { header: '运行 ID', value: (run) => run.id },
  { header: '会话 ID', value: (run) => run.sessionId },
  { header: '类型', value: (run) => run.type },
  { header: '状态', value: (run) => run.status },
  { header: '用户', value: (run) => run.user?.name ?? null },
  { header: '邮箱', value: (run) => run.user?.email ?? null },
  { header: '租户', value: (run) => run.tenant.name },
  { header: '面试任务', value: (run) => run.sessionTitle },
  { header: '模型提供商', value: (run) => run.modelUsage?.provider ?? null },
  { header: '模型', value: (run) => run.modelUsage?.model ?? null },
  { header: '模型调用次数', value: (run) => run.modelUsage?.invocationCount ?? null },
  { header: '输入 Token', value: (run) => run.modelUsage?.inputTokens ?? null },
  { header: '输出 Token', value: (run) => run.modelUsage?.outputTokens ?? null },
  { header: '缓存读取 Token', value: (run) => run.modelUsage?.cacheReadTokens ?? null },
  { header: '推理 Token', value: (run) => run.modelUsage?.reasoningTokens ?? null },
  { header: '总 Token', value: (run) => run.modelUsage?.totalTokens ?? null },
  { header: '模型耗时 (ms)', value: (run) => run.modelUsage?.latencyMs ?? null },
  { header: '命令', value: (run) => run.command },
  { header: '阶段', value: (run) => run.stage },
  { header: 'Trace ID', value: (run) => run.traceId },
  { header: 'Agent 延迟 (ms)', value: (run) => run.latencyMs },
  { header: 'Schema 通过', value: (run) => run.schemaValid },
  { header: '发生降级', value: (run) => run.fallbackUsed },
  { header: '重试次数', value: (run) => run.attemptCount },
  { header: '更新时间', value: (run) => run.updatedAt },
];

const auditLogColumns: readonly CsvColumn<AuditLogView>[] = [
  { header: '日志 ID', value: (log) => log.id },
  { header: '动作', value: (log) => log.action },
  { header: '资源类型', value: (log) => log.resourceType },
  { header: '资源 ID', value: (log) => log.resourceId },
  { header: '操作人', value: (log) => log.actorId },
  { header: '角色', value: (log) => log.actorRole },
  { header: 'Trace ID', value: (log) => log.traceId },
  { header: '结果', value: (log) => log.result },
  { header: '创建时间', value: (log) => log.createdAt },
];

const accountColumns: readonly CsvColumn<AccountView>[] = [
  { header: '账号 ID', value: (account) => account.id },
  { header: '姓名', value: (account) => account.name },
  { header: '邮箱', value: (account) => account.email },
  { header: '角色', value: (account) => account.role },
  { header: '状态', value: (account) => account.status },
  { header: '认证来源', value: (account) => account.authSource },
  { header: '租户', value: (account) => account.tenant.name },
  { header: '最近登录', value: (account) => account.lastSignedInAt },
  { header: '创建时间', value: (account) => account.createdAt },
];
