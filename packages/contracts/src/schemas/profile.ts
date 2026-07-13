import { z } from 'zod';
import { CONTRACT_LIMITS } from '../limits';

const BoundedTextSchema = z.string().trim().min(1).max(CONTRACT_LIMITS.mediumText);

export const SkillEvidenceSchema = z.object({
  label: z.string().trim().min(1).max(CONTRACT_LIMITS.shortText),
  level: z.number().min(0).max(CONTRACT_LIMITS.percentage),
  evidence: BoundedTextSchema,
});

export const UserProfileSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  targetRole: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  yearsOfExperience: z.number().int().min(0).max(CONTRACT_LIMITS.maximumExperienceYears),
  techStacks: z.array(z.string().min(1).max(CONTRACT_LIMITS.shortText)).max(CONTRACT_LIMITS.list),
  resumeSummary: z.string().max(CONTRACT_LIMITS.longText),
  projectExperiences: z.array(z.string().max(CONTRACT_LIMITS.longText)).max(CONTRACT_LIMITS.list),
  currentLevel: z.string().max(CONTRACT_LIMITS.shortText),
  updatedAt: z.string().datetime(),
});

export const ProfileSnapshotSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  profileId: z.string().min(1),
  strengths: z.array(BoundedTextSchema).max(CONTRACT_LIMITS.list),
  weaknesses: z.array(BoundedTextSchema).max(CONTRACT_LIMITS.list),
  riskSignals: z.array(BoundedTextSchema).max(CONTRACT_LIMITS.list),
  skillMap: z.array(SkillEvidenceSchema).max(CONTRACT_LIMITS.list),
  createdAt: z.string().datetime(),
});

export const ProfilePayloadSchema = z.object({
  profile: UserProfileSchema.nullable(),
  snapshot: ProfileSnapshotSchema.nullable(),
});

export const UpsertProfileInputSchema = z.object({
  targetRole: z.string().trim().min(2).max(CONTRACT_LIMITS.shortText),
  yearsOfExperience: z.coerce.number().int().min(0).max(CONTRACT_LIMITS.maximumExperienceYears),
  techStacks: z
    .array(z.string().trim().min(1).max(CONTRACT_LIMITS.shortText))
    .min(1)
    .max(CONTRACT_LIMITS.list),
  resumeSummary: z
    .string()
    .trim()
    .min(CONTRACT_LIMITS.minimumResumeSummary)
    .max(CONTRACT_LIMITS.longText),
  projectExperiences: z
    .array(
      z.string().trim().min(CONTRACT_LIMITS.minimumProjectExperience).max(CONTRACT_LIMITS.longText),
    )
    .min(1)
    .max(CONTRACT_LIMITS.list),
  currentLevel: z.string().trim().min(2).max(CONTRACT_LIMITS.shortText),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type ProfileSnapshot = z.infer<typeof ProfileSnapshotSchema>;
export type ProfilePayload = z.infer<typeof ProfilePayloadSchema>;
export type UpsertProfileInput = z.infer<typeof UpsertProfileInputSchema>;
