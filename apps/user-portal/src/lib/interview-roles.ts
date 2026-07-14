import type { CreateJobIntentInput, JobIntentPayload } from '@interview-agent/contracts';
import { DATA_AI_ROLE_TEMPLATES } from './interview-roles.data-ai';
import { ENGINEERING_ROLE_TEMPLATES } from './interview-roles.engineering';
import { GROWTH_OPERATIONS_ROLE_TEMPLATES } from './interview-roles.growth-operations';
import { MARKET_COMMERCIAL_ROLE_TEMPLATES } from './interview-roles.market-commercial';
import { PRODUCT_DESIGN_ROLE_TEMPLATES } from './interview-roles.product-design';
import { PROJECT_DELIVERY_ROLE_TEMPLATES } from './interview-roles.project-delivery';
import type { RoleGroup, RoleTemplate } from './interview-role-types';

const GENERIC_ROLE = '目标岗位';
const GENERIC_FOCUS_TAGS = ['结构表达', '业务判断', '案例复盘', '岗位匹配'];
const MAX_INTERVIEW_FOCUS_TAGS = 4;
const ROLE_GROUP_ORDER: RoleGroup[] = [
  '工程研发',
  '数据与 AI',
  '产品与设计',
  '增长与运营',
  '市场与商业',
  '项目与交付',
];

export const INTERVIEW_ROLE_TEMPLATES: RoleTemplate[] = [
  ...ENGINEERING_ROLE_TEMPLATES,
  ...DATA_AI_ROLE_TEMPLATES,
  ...PRODUCT_DESIGN_ROLE_TEMPLATES,
  ...GROWTH_OPERATIONS_ROLE_TEMPLATES,
  ...MARKET_COMMERCIAL_ROLE_TEMPLATES,
  ...PROJECT_DELIVERY_ROLE_TEMPLATES,
];

export const ROLE_GROUPS = ROLE_GROUP_ORDER.map((group) => ({
  group,
  roles: INTERVIEW_ROLE_TEMPLATES.filter((role) => role.group === group),
}));

export const ROLE_TITLE_OPTIONS = INTERVIEW_ROLE_TEMPLATES.map((role) => role.title);

export function roleInputFor(title: string): CreateJobIntentInput {
  const template = findRoleTemplate(title);
  if (template) return toJobInput(template);
  return {
    targetRole: title.trim() || GENERIC_ROLE,
    jdText: '请补充目标岗位的职责、业务背景和关键要求，系统会据此生成更贴近真实场景的训练内容。',
    companyContext: '请说明目标公司的业务阶段、团队协作方式或你关注的业务挑战。',
    communicationText: '请说明你希望重点训练的表达、项目案例或面试场景。',
  };
}

export function interviewPlanForJob(job: JobIntentPayload | undefined) {
  const roleTitle = job?.intent.targetRole.trim() || GENERIC_ROLE;
  const analyzedTags = job?.profile?.interviewFocus.filter(Boolean).slice(0, MAX_INTERVIEW_FOCUS_TAGS) ?? [];
  const template = findRoleTemplate(roleTitle);
  return {
    roleTitle,
    title: `${roleTitle}面试训练`,
    focusTags: analyzedTags.length ? analyzedTags : (template?.focusTags ?? GENERIC_FOCUS_TAGS),
  };
}

function findRoleTemplate(title: string): RoleTemplate | undefined {
  return INTERVIEW_ROLE_TEMPLATES.find((role) => role.title === title.trim());
}

function toJobInput(template: RoleTemplate): CreateJobIntentInput {
  return {
    targetRole: template.title,
    jdText: template.jdText,
    companyContext: template.companyContext,
    communicationText: template.communicationText,
  };
}