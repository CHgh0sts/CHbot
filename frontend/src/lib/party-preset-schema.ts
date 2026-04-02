import { z } from 'zod';
import { BOT_ROLE_KEYS } from '@/lib/role-keys';
import { MAX_BASE64_CHARS } from '@/lib/role-image-storage';
import { isAllowedRoleImageUrl } from '@/lib/role-image-url';

const roleKeySet = new Set<string>(BOT_ROLE_KEYS);

const roleImageStoredBodySchema = z.object({
  mime: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  data: z.string().min(1).max(MAX_BASE64_CHARS),
});

const roleImageOverrideValueSchema = z.union([
  z.null(),
  z.string(),
  roleImageStoredBodySchema,
]);

function refineRoleImageRecord(obj: Record<string, unknown>, ctx: z.RefinementCtx) {
  for (const [k, v] of Object.entries(obj)) {
    if (!roleKeySet.has(k)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Clé de rôle inconnue : ${k}`,
      });
      return;
    }
    if (v === null || v === undefined) continue;
    if (typeof v === 'string') {
      const t = v.trim();
      if (!t) continue;
      if (!isAllowedRoleImageUrl(t)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `URL HTTPS non autorisée pour ${k}`,
        });
        return;
      }
      continue;
    }
    const r = roleImageStoredBodySchema.safeParse(v);
    if (!r.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Image (fichier / base64) invalide pour ${k}`,
      });
      return;
    }
  }
}

/** Aligné sur `CompositionConfig` du bot (lg-config). */
export const compositionConfigJsonSchema = z.object({
  minPlayers: z.number().int().min(4).max(18),
  wolfCount: z.number().int().min(1).max(10).nullable(),
  includeSeer: z.boolean(),
  includeWitch: z.boolean(),
  includeHunter: z.boolean(),
  includeCupid: z.boolean(),
  includeGuard: z.boolean(),
  includeThief: z.boolean(),
  includeAngel: z.boolean(),
  includeLittleGirl: z.boolean(),
  revealDeadRoles: z.boolean(),
  darkNightMode: z.boolean(),
  gossipSeerMode: z.boolean(),
  tripleLoversMode: z.boolean(),
  announceNightProtection: z.boolean(),
  villagerCount: z.number().int().min(0).max(18).nullable(),
});

export type CompositionConfigJson = z.infer<typeof compositionConfigJsonSchema>;

const roleImageOverridesField = z
  .record(z.string(), roleImageOverrideValueSchema)
  .optional()
  .superRefine((obj, ctx) => {
    if (!obj) return;
    refineRoleImageRecord(obj as Record<string, unknown>, ctx);
  });

export const createPartyPresetBodySchema = z.object({
  name: z.string().max(120).optional(),
  composition: compositionConfigJsonSchema,
  roleImageOverrides: roleImageOverridesField,
});

export const patchPartyPresetImagesSchema = z.object({
  roleImageOverrides: z
    .record(z.string(), roleImageOverrideValueSchema)
    .superRefine((obj, ctx) => {
      refineRoleImageRecord(obj as Record<string, unknown>, ctx);
    }),
});

/** Valeurs par défaut alignées sur le bot (`defaultCompositionConfig`). */
export const defaultCompositionFormValues: CompositionConfigJson = {
  minPlayers: 6,
  wolfCount: null,
  includeSeer: true,
  includeWitch: true,
  includeHunter: true,
  includeCupid: true,
  includeGuard: false,
  includeThief: false,
  includeAngel: false,
  includeLittleGirl: false,
  revealDeadRoles: true,
  darkNightMode: false,
  gossipSeerMode: false,
  tripleLoversMode: false,
  announceNightProtection: false,
  villagerCount: null,
};
