import type { AgentRunDetailView } from '@interview-agent/contracts';

const DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'short',
  timeStyle: 'medium',
});
const NUMBER_FORMATTER = new Intl.NumberFormat('zh-CN');
const COMMAND_LABELS: Record<NonNullable<AgentRunDetailView['command']>, string> = {
  start: '开始面试',
  advance: '继续面试',
  answer: '提交回答',
};
const STAGE_LABELS: Record<string, string> = {
  warmup: '热身',
  self_intro: '自我介绍',
  tech_basics: '技术基础',
  jd_core: '岗位核心',
  project_deep_dive: '项目深挖',
  scenario_design: '场景设计',
  hr: '综合沟通',
  final_evaluation: '整轮评估',
  report_ready: '报告生成',
  memory_updated: '记忆更新',
};
const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
  qwen: 'Qwen',
  openai_compatible: '兼容端点',
};

export const STATUS_LABELS: Record<AgentRunDetailView['status'], string> = {
  running: '运行中',
  succeeded: '成功',
  failed: '失败',
  fallback: '已降级',
};

export const RUN_STATUS_COLORS: Record<AgentRunDetailView['status'], string> = {
  running: 'processing',
  succeeded: 'success',
  failed: 'error',
  fallback: 'warning',
};

export function commandLabel(command: AgentRunDetailView['command']): string {
  return command ? COMMAND_LABELS[command] : '未知命令';
}

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

export function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

export function tokenValue(value: number | null): string {
  return value === null ? '未返回' : NUMBER_FORMATTER.format(value);
}

export function durationValue(value: number | null): string {
  return value === null ? '未采集' : `${NUMBER_FORMATTER.format(value)} ms`;
}

export function formatRunTime(value: string): string {
  return DATE_FORMATTER.format(new Date(value));
}

export function qualitySummary(run: AgentRunDetailView): string {
  const latency = run.latencyMs === null ? '无延迟数据' : `${run.latencyMs} ms`;
  return run.schemaValid === null
    ? `未校验 · ${latency}`
    : `${run.schemaValid ? 'Schema 通过' : 'Schema 失败'} · ${latency}`;
}
