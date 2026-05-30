import { z } from "zod";

export const continuationBehaviorSchema = z.enum([
  "return-current-thread",
  "smart-continuation",
  "ask-every-time"
]);

export const preferenceScopeSchema = z.enum(["project", "global"]);

export const continuationBehaviorSourceSchema = z.enum([
  "project-default",
  "global-default",
  "fallback"
]);

export const governanceIntensitySchema = z.enum([
  "light",
  "standard",
  "audit-heavy"
]);

export const governanceIntensitySourceSchema = z.enum([
  "invocation",
  "project-default",
  "agents-md-default",
  "fallback"
]);

export const storedPreferencesSchema = z.object({
  continuationBehavior: continuationBehaviorSchema.optional(),
  governanceIntensity: governanceIntensitySchema.optional(),
  projectCharterGate: z.object({
    declinedSetup: z.boolean().default(false),
    declineReason: z.string().min(1).nullable().default(null),
    declinedAt: z.string().min(1).nullable().default(null)
  }).optional()
});

export const resolvedContinuationPreferenceSchema = z.object({
  continuationBehavior: continuationBehaviorSchema,
  continuationBehaviorSource: continuationBehaviorSourceSchema
});

export const resolvedGovernanceIntensityPreferenceSchema = z.object({
  governanceIntensity: governanceIntensitySchema,
  governanceIntensitySource: governanceIntensitySourceSchema
});

export const preferencesSchema = z.object({
  projectDefault: continuationBehaviorSchema.nullable(),
  globalDefault: continuationBehaviorSchema.nullable(),
  governanceIntensityDefault: governanceIntensitySchema.nullable().optional(),
  agentsMdGovernanceDefault: governanceIntensitySchema.nullable().optional(),
  resolved: resolvedContinuationPreferenceSchema,
  resolvedGovernance: resolvedGovernanceIntensityPreferenceSchema.optional()
});

export type ContinuationBehavior = z.infer<typeof continuationBehaviorSchema>;
export type GovernanceIntensity = z.infer<typeof governanceIntensitySchema>;
export type PreferenceScope = z.infer<typeof preferenceScopeSchema>;
export type ContinuationBehaviorSource = z.infer<
  typeof continuationBehaviorSourceSchema
>;
export type GovernanceIntensitySource = z.infer<
  typeof governanceIntensitySourceSchema
>;
export type StoredPreferences = z.infer<typeof storedPreferencesSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;

export function resolveContinuationBehavior(
  projectDefault?: ContinuationBehavior | null,
  globalDefault?: ContinuationBehavior | null,
  fallback: ContinuationBehavior = "ask-every-time"
) {
  if (projectDefault) {
    return resolvedContinuationPreferenceSchema.parse({
      continuationBehavior: projectDefault,
      continuationBehaviorSource: "project-default"
    });
  }

  if (globalDefault) {
    return resolvedContinuationPreferenceSchema.parse({
      continuationBehavior: globalDefault,
      continuationBehaviorSource: "global-default"
    });
  }

  return resolvedContinuationPreferenceSchema.parse({
    continuationBehavior: fallback,
    continuationBehaviorSource: "fallback"
  });
}

export function resolveGovernanceIntensity(
  projectDefault?: GovernanceIntensity | null,
  agentsMdDefault?: GovernanceIntensity | null,
  fallback: GovernanceIntensity = "standard"
) {
  if (projectDefault) {
    return resolvedGovernanceIntensityPreferenceSchema.parse({
      governanceIntensity: projectDefault,
      governanceIntensitySource: "project-default"
    });
  }

  if (agentsMdDefault) {
    return resolvedGovernanceIntensityPreferenceSchema.parse({
      governanceIntensity: agentsMdDefault,
      governanceIntensitySource: "agents-md-default"
    });
  }

  return resolvedGovernanceIntensityPreferenceSchema.parse({
    governanceIntensity: fallback,
    governanceIntensitySource: "fallback"
  });
}

export function createPreferences(
  projectDefault?: ContinuationBehavior | null,
  globalDefault?: ContinuationBehavior | null,
  fallback: ContinuationBehavior = "ask-every-time",
  governanceIntensityDefault?: GovernanceIntensity | null,
  agentsMdGovernanceDefault?: GovernanceIntensity | null
): Preferences {
  return preferencesSchema.parse({
    projectDefault: projectDefault ?? null,
    globalDefault: globalDefault ?? null,
    governanceIntensityDefault: governanceIntensityDefault ?? null,
    agentsMdGovernanceDefault: agentsMdGovernanceDefault ?? null,
    resolved: resolveContinuationBehavior(projectDefault, globalDefault, fallback),
    resolvedGovernance: resolveGovernanceIntensity(
      governanceIntensityDefault,
      agentsMdGovernanceDefault
    )
  });
}
