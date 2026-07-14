import type { InterviewStage, InterviewTurnRole } from '@interview-agent/contracts';

export const INTERVIEW_STAGE_LABELS: Record<InterviewStage, string> = {
  warmup: '开场破冰',
  self_intro: '自我介绍',
  tech_basics: '基础能力',
  jd_core: '岗位核心能力',
  project_deep_dive: '项目深挖',
  scenario_design: '场景判断',
  hr: '综合沟通',
  final_evaluation: '综合评估',
  report_ready: '报告生成',
  memory_updated: '训练记录更新',
};

export function interviewStageLabel(stage: InterviewStage): string {
  return INTERVIEW_STAGE_LABELS[stage];
}

export function interviewSpeakerLabel(role: InterviewTurnRole): string {
  switch (role) {
    case 'candidate':
      return '我';
    case 'interviewer':
      return 'AI 面试官';
    case 'system':
      return '训练助手';
  }
}

