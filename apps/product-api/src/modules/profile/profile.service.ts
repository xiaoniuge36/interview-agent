import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ProfilePayloadSchema,
  ProfileSnapshotSchema,
  UserProfileSchema,
  type ProfilePayload,
  type ProfileSnapshot,
  type UpsertProfileInput,
  type UserProfile,
} from '@interview-agent/contracts';
import { AuditService, jsonValue } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PrismaService } from '../../common/database/prisma.service';

const MIN_SKILL_LEVEL = 45;
const BASE_SKILL_LEVEL = 82;
const SKILL_LEVEL_STEP = 7;

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly audit: AuditService,
  ) {}

  async get(context: ProductRequestContext): Promise<ProfilePayload> {
    this.assertAccess(context, 'profile:read');
    const profile = await this.prisma.userProfile.findUnique({
      where: { tenantId_userId: ownerKey(context) },
      include: { snapshots: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!profile) return ProfilePayloadSchema.parse({ profile: null, snapshot: null });
    return ProfilePayloadSchema.parse({
      profile: mapProfile(profile),
      snapshot: profile.snapshots[0] ? mapSnapshot(profile.snapshots[0]) : null,
    });
  }

  async upsert(context: ProductRequestContext, input: UpsertProfileInput): Promise<ProfilePayload> {
    this.assertAccess(context, 'profile:write');
    return this.prisma.$transaction(async (transaction) => {
      const profile = await transaction.userProfile.upsert({
        where: { tenantId_userId: ownerKey(context) },
        create: { tenantId: context.tenantId, userId: context.actor.id, ...input },
        update: input,
      });
      const snapshot = createSnapshot(profile);
      const storedSnapshot = await transaction.profileSnapshot.create({
        data: {
          tenantId: context.tenantId,
          profileId: profile.id,
          strengths: snapshot.strengths,
          weaknesses: snapshot.weaknesses,
          riskSignals: snapshot.riskSignals,
          skillMap: jsonValue(snapshot.skillMap),
        },
      });
      await this.audit.record(
        context,
        {
          action: 'profile.upsert',
          resourceType: 'UserProfile',
          resourceId: profile.id,
          metadata: { targetRole: profile.targetRole },
        },
        transaction,
      );
      return ProfilePayloadSchema.parse({
        profile: mapProfile(profile),
        snapshot: mapSnapshot(storedSnapshot),
      });
    }, transactionOptions());
  }

  private assertAccess(context: ProductRequestContext, action: 'profile:read' | 'profile:write') {
    this.policy.assert(context.actor, action, {
      tenantId: context.tenantId,
      ownerId: context.actor.id,
    });
  }
}

function ownerKey(context: ProductRequestContext) {
  return { tenantId: context.tenantId, userId: context.actor.id };
}

function mapProfile(profile: {
  id: string;
  tenantId: string;
  userId: string;
  targetRole: string;
  yearsOfExperience: number;
  techStacks: string[];
  resumeSummary: string;
  projectExperiences: string[];
  currentLevel: string;
  updatedAt: Date;
}): UserProfile {
  return UserProfileSchema.parse({ ...profile, updatedAt: profile.updatedAt.toISOString() });
}

function mapSnapshot(snapshot: {
  id: string;
  tenantId: string;
  profileId: string;
  strengths: string[];
  weaknesses: string[];
  riskSignals: string[];
  skillMap: Prisma.JsonValue;
  createdAt: Date;
}): ProfileSnapshot {
  return ProfileSnapshotSchema.parse({ ...snapshot, createdAt: snapshot.createdAt.toISOString() });
}

function createSnapshot(profile: {
  id: string;
  tenantId: string;
  techStacks: string[];
  currentLevel: string;
}) {
  return {
    tenantId: profile.tenantId,
    profileId: profile.id,
    strengths: ['工程经验可迁移', '产品体验意识较强', '具备 AI 应用落地意识'],
    weaknesses: ['Agent 状态机表达需要更结构化', '模型评估与可观测案例需要补强'],
    riskSignals: ['需要明确区分 Product API 与 Agent Runtime 的职责边界'],
    skillMap: profile.techStacks.map((label, index) => ({
      label,
      level: Math.max(MIN_SKILL_LEVEL, BASE_SKILL_LEVEL - index * SKILL_LEVEL_STEP),
      evidence: `来自用户画像：${profile.currentLevel}`,
    })),
  };
}

function transactionOptions() {
  return { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const;
}
