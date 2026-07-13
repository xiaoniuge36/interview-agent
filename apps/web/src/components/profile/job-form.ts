import type { CreateJobIntentInput } from '@interview-agent/contracts';

export const DEFAULT_JOB_FORM: CreateJobIntentInput = {
  targetRole: 'AI Agent 应用开发工程师',
  jdText:
    '负责 AI Agent 应用开发，建设面向业务场景的 Agent Runtime、RAG 检索链路、模型调用封装、评估与可观测体系。需要熟悉 TypeScript、Python、服务端 API、前端交互体验，并能解释复杂状态机和权限边界。',
  companyContext: '业务处于 AI 产品化阶段，强调端到端交付、工程稳定性、权限治理和成本控制。',
  communicationText:
    '面试官可能重点追问：为什么 Product API 是事实源，Agent Runtime 如何避免绕过权限，RAG 结果如何审计。',
};
