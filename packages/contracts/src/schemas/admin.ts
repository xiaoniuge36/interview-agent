import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';
import {
  CandidateReviewSchema,
  CandidateReviewStatusSchema,
  ImportTaskStatusSchema,
  QuestionDifficultySchema,
  QuestionSchema,
  QuestionStatusSchema,
} from './training';

const ADMIN_PAGE_DEFAULT = 1;
const ADMIN_PAGE_SIZE_DEFAULT = 20;
const ADMIN_PAGE_SIZE_MAX = 100;
const ADMIN_KEYWORD_MAX_LENGTH = 120;

export const AdminPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(ADMIN_PAGE_DEFAULT).default(ADMIN_PAGE_DEFAULT),
  pageSize: z.coerce
    .number()
    .int()
    .min(ADMIN_PAGE_DEFAULT)
    .max(ADMIN_PAGE_SIZE_MAX)
    .default(ADMIN_PAGE_SIZE_DEFAULT),
  keyword: z.string().trim().max(ADMIN_KEYWORD_MAX_LENGTH).optional(),
});

export const AdminPageSchema = <ItemSchema extends z.ZodTypeAny>(itemSchema: ItemSchema) =>
  z.object({
    items: z.array(itemSchema).max(ADMIN_PAGE_SIZE_MAX),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(ADMIN_PAGE_DEFAULT),
    pageSize: z.number().int().min(ADMIN_PAGE_DEFAULT).max(ADMIN_PAGE_SIZE_MAX),
  });

export const ModelProfileSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  model: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  purpose: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  status: z.enum(['active', 'standby', 'disabled']),
  budget: z.enum(['low', 'medium', 'high']),
  schemaMode: z.boolean(),
  updatedAt: z.string().datetime(),
});

export const AgentRunViewSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().nullable(),
  type: z.enum(['mock_interview']),
  status: z.enum(['running', 'succeeded', 'failed', 'fallback']),
  stage: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  traceId: z.string().min(CONTRACT_LIMITS.traceIdMinLength).max(CONTRACT_LIMITS.traceIdMaxLength),
  latencyMs: z.number().int().nonnegative().nullable(),
  schemaValid: z.boolean().nullable(),
  fallbackUsed: z.boolean(),
  attemptCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export const AuditLogViewSchema = z.object({
  id: z.string().min(1),
  action: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  resourceType: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  resourceId: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  actorId: z.string().min(1),
  actorRole: z.string().min(1),
  traceId: z.string().min(CONTRACT_LIMITS.traceIdMinLength).max(CONTRACT_LIMITS.traceIdMaxLength),
  result: z.enum(['success', 'failure']),
  createdAt: z.string().datetime(),
});

export const DashboardSchema = z.object({
  stats: z.object({
    publishedQuestions: z.number().int().nonnegative(),
    pendingCandidates: z.number().int().nonnegative(),
    activeInterviews: z.number().int().nonnegative(),
    reportsReady: z.number().int().nonnegative(),
    schemaPassRate: z.number().min(0).max(CONTRACT_LIMITS.percentage),
    avgLatencyMs: z.number().nonnegative(),
  }),
  importPipeline: z.array(
    z.object({
      stage: z.enum(['received', 'processing', 'review', 'published', 'failed']),
      count: z.number().int().nonnegative(),
    }),
  ),
  recentRuns: z.array(AgentRunViewSchema).max(CONTRACT_LIMITS.recentRuns),
});

export const PlatformDashboardPeriodSchema = z.enum(['today', '7d', '30d']).default('7d');

export const PlatformDashboardQuerySchema = z.object({
  period: PlatformDashboardPeriodSchema,
});

export const PlatformTrendPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accountsCreated: z.number().int().nonnegative(),
  questionsPublished: z.number().int().nonnegative(),
  trainingCompleted: z.number().int().nonnegative(),
  agentRuns: z.number().int().nonnegative(),
});

export const PlatformFunnelSchema = z.object({
  imports: z.number().int().nonnegative(),
  pendingCandidates: z.number().int().nonnegative(),
  publishedQuestions: z.number().int().nonnegative(),
  practiceSubmissions: z.number().int().nonnegative(),
  practiceReports: z.number().int().nonnegative(),
});

export const PlatformAlertSchema = z.object({
  code: z.enum(['review_backlog', 'failed_imports', 'runtime_risk']),
  severity: z.enum(['warning', 'critical']),
  count: z.number().int().nonnegative(),
});

export const PlatformDashboardSchema = z.object({
  period: PlatformDashboardPeriodSchema,
  range: z.object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
  }),
  accounts: z.object({
    total: z.number().int().nonnegative(),
    created: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    disabled: z.number().int().nonnegative(),
    tenants: z.number().int().nonnegative(),
    admin: z.number().int().nonnegative(),
    users: z.number().int().nonnegative(),
  }),
  content: z.object({
    imports: z.number().int().nonnegative(),
    pendingCandidates: z.number().int().nonnegative(),
    publishedQuestions: z.number().int().nonnegative(),
    failedImports: z.number().int().nonnegative(),
  }),
  training: z.object({
    interviews: z.number().int().nonnegative(),
    reports: z.number().int().nonnegative(),
    practiceSubmissions: z.number().int().nonnegative(),
    practiceReports: z.number().int().nonnegative(),
  }),
  runtime: z.object({
    runs: z.number().int().nonnegative(),
    successRate: z.number().min(0).max(CONTRACT_LIMITS.percentage),
    schemaPassRate: z.number().min(0).max(CONTRACT_LIMITS.percentage),
    averageLatencyMs: z.number().nonnegative(),
    fallbacks: z.number().int().nonnegative(),
    recentFailures: z.array(AgentRunViewSchema).max(CONTRACT_LIMITS.recentRuns),
  }),
  trend: z.array(PlatformTrendPointSchema).min(1).max(30),
  funnel: PlatformFunnelSchema,
  alerts: z.array(PlatformAlertSchema).max(3),
});

export const AccountStatusSchema = z.enum(['active', 'disabled']);
export const ManagedAccountRoleSchema = z.enum([
  'user',
  'question_reviewer',
  'admin',
  'platform_admin',
  'support',
]);
export const AccountKindSchema = z.enum(['admin', 'user']);
export const AccountAuthSourceSchema = z.enum(['local', 'oidc']);
export const CreateLocalAdminRoleSchema = z.enum(['admin', 'platform_admin']);
export const TenantOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  slug: z.string().min(1).max(CONTRACT_LIMITS.shortText),
});
export const CreateLocalAdminInputSchema = z
  .object({
    name: z.string().trim().min(2, '姓名至少需要 2 个字符。').max(80, '姓名长度不能超过 80 个字符。'),
    email: z
      .string()
      .trim()
      .email('请输入有效的邮箱地址。')
      .max(320, '邮箱地址过长。')
      .transform((value) => value.toLowerCase()),
    password: z.string().min(1, '请输入初始密码。'),
    role: CreateLocalAdminRoleSchema,
    tenantSlug: z.string().trim().min(1, '请选择租户。').max(CONTRACT_LIMITS.shortText).optional(),
  })
  .superRefine((input, context) => {
    if (input.role === 'admin' && !input.tenantSlug) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tenantSlug'],
        message: '租户管理员必须选择租户。',
      });
    }
    if (input.role === 'platform_admin' && input.tenantSlug) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tenantSlug'],
        message: '平台管理员固定归入系统租户。',
      });
    }
  });

export const AccountViewSchema = z.object({
  id: z.string().min(1),
  subject: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  role: ManagedAccountRoleSchema,
  status: AccountStatusSchema,
  kind: AccountKindSchema,
  authSource: AccountAuthSourceSchema,
  tenant: z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(CONTRACT_LIMITS.shortText),
    slug: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  }),
  lastSignedInAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const AccountDetailSchema = AccountViewSchema.extend({
  disabledAt: z.string().datetime().nullable(),
  disabledByUserId: z.string().nullable(),
  auditLogs: z.array(AuditLogViewSchema).max(20),
});

export const UpdateAccountRoleInputSchema = z.object({
  role: ManagedAccountRoleSchema,
});

export const UpdateAccountStatusInputSchema = z.object({
  status: AccountStatusSchema,
});

export const ResetLocalPasswordInputSchema = z.object({
  password: z.string().min(1, '请输入密码。'),
});

export const QuestionListSchema = z.array(QuestionSchema).max(CONTRACT_LIMITS.largeList);
export const CandidateReviewListSchema = z
  .array(CandidateReviewSchema)
  .max(CONTRACT_LIMITS.largeList);
export const ModelProfileListSchema = z.array(ModelProfileSchema).max(CONTRACT_LIMITS.mediumList);
export const AgentRunListSchema = z.array(AgentRunViewSchema).max(CONTRACT_LIMITS.largeList);
export const AuditLogListSchema = z.array(AuditLogViewSchema).max(CONTRACT_LIMITS.largeList);

export const ImportTaskListQuerySchema = AdminPaginationQuerySchema.extend({
  status: ImportTaskStatusSchema.optional(),
});

export const QuestionListQuerySchema = AdminPaginationQuerySchema.extend({
  status: QuestionStatusSchema.optional(),
  difficulty: QuestionDifficultySchema.optional(),
});

export const CandidateReviewListQuerySchema = AdminPaginationQuerySchema.extend({
  status: CandidateReviewStatusSchema.optional(),
  importTaskId: z.string().min(1).optional(),
});

export const ModelProfileListQuerySchema = AdminPaginationQuerySchema.extend({
  status: ModelProfileSchema.shape.status.optional(),
});

export const AgentRunListQuerySchema = AdminPaginationQuerySchema.extend({
  status: AgentRunViewSchema.shape.status.optional(),
});

export const AuditLogListQuerySchema = AdminPaginationQuerySchema.extend({
  result: AuditLogViewSchema.shape.result.optional(),
});

export const AccountListQuerySchema = AdminPaginationQuerySchema.extend({
  kind: AccountKindSchema.optional(),
  role: ManagedAccountRoleSchema.optional(),
  status: AccountStatusSchema.optional(),
  authSource: AccountAuthSourceSchema.optional(),
  tenantKeyword: z.string().trim().max(ADMIN_KEYWORD_MAX_LENGTH).optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
});

export type Dashboard = z.infer<typeof DashboardSchema>;
export type PlatformDashboardPeriod = z.infer<typeof PlatformDashboardPeriodSchema>;
export type PlatformDashboardQuery = z.infer<typeof PlatformDashboardQuerySchema>;
export type PlatformDashboard = z.infer<typeof PlatformDashboardSchema>;
export type PlatformTrendPoint = z.infer<typeof PlatformTrendPointSchema>;
export type PlatformFunnel = z.infer<typeof PlatformFunnelSchema>;
export type PlatformAlert = z.infer<typeof PlatformAlertSchema>;
export type AccountStatus = z.infer<typeof AccountStatusSchema>;
export type ManagedAccountRole = z.infer<typeof ManagedAccountRoleSchema>;
export type AccountKind = z.infer<typeof AccountKindSchema>;
export type AccountAuthSource = z.infer<typeof AccountAuthSourceSchema>;
export type CreateLocalAdminRole = z.infer<typeof CreateLocalAdminRoleSchema>;
export type TenantOption = z.infer<typeof TenantOptionSchema>;
export type CreateLocalAdminInput = z.infer<typeof CreateLocalAdminInputSchema>;
export type AccountView = z.infer<typeof AccountViewSchema>;
export type AccountDetail = z.infer<typeof AccountDetailSchema>;
export type UpdateAccountRoleInput = z.infer<typeof UpdateAccountRoleInputSchema>;
export type UpdateAccountStatusInput = z.infer<typeof UpdateAccountStatusInputSchema>;
export type ResetLocalPasswordInput = z.infer<typeof ResetLocalPasswordInputSchema>;
export type ModelProfile = z.infer<typeof ModelProfileSchema>;
export type AgentRunView = z.infer<typeof AgentRunViewSchema>;
export type AuditLogView = z.infer<typeof AuditLogViewSchema>;
export type AdminPaginationQuery = z.infer<typeof AdminPaginationQuerySchema>;
export type ImportTaskListQuery = z.infer<typeof ImportTaskListQuerySchema>;
export type QuestionListQuery = z.infer<typeof QuestionListQuerySchema>;
export type CandidateReviewListQuery = z.infer<typeof CandidateReviewListQuerySchema>;
export type ModelProfileListQuery = z.infer<typeof ModelProfileListQuerySchema>;
export type AgentRunListQuery = z.infer<typeof AgentRunListQuerySchema>;
export type AuditLogListQuery = z.infer<typeof AuditLogListQuerySchema>;
export type AccountListQuery = z.infer<typeof AccountListQuerySchema>;
