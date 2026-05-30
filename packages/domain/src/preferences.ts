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

export const operatorExplanationStyleSchema = z.enum([
  "concise",
  "balanced",
  "teaching",
  "detailed"
]);

export const operatorExplanationStyleSourceSchema = z.enum([
  "project-default",
  "agents-md-default",
  "project-brief-default",
  "fallback"
]);

export const DEFAULT_VALUE_HEARTBEAT_QUESTIONS = [
  "Did the project become more usable, understandable, reliable, or closer to its stated goal?",
  "Is the next engineering step still the highest-value direction?",
  "Should the project return to product surface, user experience, architecture map, or behavior validation?"
] as const;

export const valueHeartbeatPreferenceSchema = z.object({
  questions: z.array(z.string().min(1)).min(1),
  source: z.enum(["project-default", "fallback"])
});

export const storedPreferencesSchema = z.object({
  continuationBehavior: continuationBehaviorSchema.optional(),
  governanceIntensity: governanceIntensitySchema.optional(),
  operatorExplanationStyle: operatorExplanationStyleSchema.optional(),
  valueHeartbeatQuestions: z.array(z.string().min(1)).min(1).optional(),
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

export const resolvedOperatorExplanationStylePreferenceSchema = z.object({
  operatorExplanationStyle: operatorExplanationStyleSchema,
  operatorExplanationStyleSource: operatorExplanationStyleSourceSchema
});

export const preferencesSchema = z.object({
  projectDefault: continuationBehaviorSchema.nullable(),
  globalDefault: continuationBehaviorSchema.nullable(),
  governanceIntensityDefault: governanceIntensitySchema.nullable().optional(),
  agentsMdGovernanceDefault: governanceIntensitySchema.nullable().optional(),
  operatorExplanationStyleDefault: operatorExplanationStyleSchema
    .nullable()
    .optional(),
  agentsMdOperatorExplanationStyleDefault: operatorExplanationStyleSchema
    .nullable()
    .optional(),
  projectBriefOperatorExplanationStyleDefault: operatorExplanationStyleSchema
    .nullable()
    .optional(),
  valueHeartbeat: valueHeartbeatPreferenceSchema.optional(),
  resolved: resolvedContinuationPreferenceSchema,
  resolvedGovernance: resolvedGovernanceIntensityPreferenceSchema.optional(),
  resolvedOperatorExplanation:
    resolvedOperatorExplanationStylePreferenceSchema.optional()
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
export type OperatorExplanationStyle = z.infer<
  typeof operatorExplanationStyleSchema
>;
export type OperatorExplanationStyleSource = z.infer<
  typeof operatorExplanationStyleSourceSchema
>;
export type ValueHeartbeatPreference = z.infer<
  typeof valueHeartbeatPreferenceSchema
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

export function resolveOperatorExplanationStyle(
  projectDefault?: OperatorExplanationStyle | null,
  agentsMdDefault?: OperatorExplanationStyle | null,
  projectBriefDefault?: OperatorExplanationStyle | null,
  fallback: OperatorExplanationStyle = "balanced"
) {
  if (projectDefault) {
    return resolvedOperatorExplanationStylePreferenceSchema.parse({
      operatorExplanationStyle: projectDefault,
      operatorExplanationStyleSource: "project-default"
    });
  }

  if (agentsMdDefault) {
    return resolvedOperatorExplanationStylePreferenceSchema.parse({
      operatorExplanationStyle: agentsMdDefault,
      operatorExplanationStyleSource: "agents-md-default"
    });
  }

  if (projectBriefDefault) {
    return resolvedOperatorExplanationStylePreferenceSchema.parse({
      operatorExplanationStyle: projectBriefDefault,
      operatorExplanationStyleSource: "project-brief-default"
    });
  }

  return resolvedOperatorExplanationStylePreferenceSchema.parse({
    operatorExplanationStyle: fallback,
    operatorExplanationStyleSource: "fallback"
  });
}

export function createValueHeartbeatPreference(
  projectQuestions?: string[] | null
): ValueHeartbeatPreference {
  const questions =
    projectQuestions && projectQuestions.length > 0
      ? projectQuestions
      : [...DEFAULT_VALUE_HEARTBEAT_QUESTIONS];

  return valueHeartbeatPreferenceSchema.parse({
    questions,
    source: projectQuestions && projectQuestions.length > 0
      ? "project-default"
      : "fallback"
  });
}

export function createPreferences(
  projectDefault?: ContinuationBehavior | null,
  globalDefault?: ContinuationBehavior | null,
  fallback: ContinuationBehavior = "ask-every-time",
  governanceIntensityDefault?: GovernanceIntensity | null,
  agentsMdGovernanceDefault?: GovernanceIntensity | null,
  valueHeartbeatQuestions?: string[] | null,
  operatorExplanationStyleDefault?: OperatorExplanationStyle | null,
  agentsMdOperatorExplanationStyleDefault?: OperatorExplanationStyle | null,
  projectBriefOperatorExplanationStyleDefault?: OperatorExplanationStyle | null
): Preferences {
  return preferencesSchema.parse({
    projectDefault: projectDefault ?? null,
    globalDefault: globalDefault ?? null,
    governanceIntensityDefault: governanceIntensityDefault ?? null,
    agentsMdGovernanceDefault: agentsMdGovernanceDefault ?? null,
    operatorExplanationStyleDefault: operatorExplanationStyleDefault ?? null,
    agentsMdOperatorExplanationStyleDefault:
      agentsMdOperatorExplanationStyleDefault ?? null,
    projectBriefOperatorExplanationStyleDefault:
      projectBriefOperatorExplanationStyleDefault ?? null,
    valueHeartbeat: createValueHeartbeatPreference(valueHeartbeatQuestions),
    resolved: resolveContinuationBehavior(projectDefault, globalDefault, fallback),
    resolvedGovernance: resolveGovernanceIntensity(
      governanceIntensityDefault,
      agentsMdGovernanceDefault
    ),
    resolvedOperatorExplanation: resolveOperatorExplanationStyle(
      operatorExplanationStyleDefault,
      agentsMdOperatorExplanationStyleDefault,
      projectBriefOperatorExplanationStyleDefault
    )
  });
}
