import { z } from 'zod';

export const ThemeModeSchema = z.enum([
  'aurora',
  'terminal',
  'constructivist',
  'daylight',
  'glass',
  'playground',
]);

export const ThemePreferencesSchema = z
  .object({
    theme: ThemeModeSchema,
    motion: z.boolean(),
  })
  .strict();

export const UserPreferenceSchema = ThemePreferencesSchema.extend({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  updatedAt: z.string().datetime(),
});

export const UserPreferencePayloadSchema = z
  .object({
    preferences: UserPreferenceSchema.nullable(),
  })
  .strict();

export const UpsertUserPreferenceInputSchema = ThemePreferencesSchema;

export type ThemeMode = z.infer<typeof ThemeModeSchema>;
export type ThemePreferences = z.infer<typeof ThemePreferencesSchema>;
export type UserPreference = z.infer<typeof UserPreferenceSchema>;
export type UserPreferencePayload = z.infer<typeof UserPreferencePayloadSchema>;
export type UpsertUserPreferenceInput = z.infer<typeof UpsertUserPreferenceInputSchema>;
