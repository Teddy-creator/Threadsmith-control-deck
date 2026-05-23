import { z } from "zod";
import { phaseOwnerSchema } from "./currentPhase.ts";

export const stateBoundaryLayerSchema = z.enum([
  "project-constitution",
  "committed-truth",
  "derived-packet",
  "evidence",
  "audit",
  "runtime-artifact"
]);

export const stateBoundaryAuthoritySchema = z.enum([
  "authoritative",
  "derived",
  "proof",
  "audit",
  "runtime"
]);

export const stateBoundaryWriteModeSchema = z.enum([
  "direct",
  "proposal",
  "read-only"
]);

export const stateBoundaryAgentKindSchema = z.enum([
  "threadsmith-native",
  "external-known",
  "external-unknown"
]);

export const stateBoundaryArtifactSchema = z.object({
  path: z.string().min(1),
  layer: stateBoundaryLayerSchema,
  authority: stateBoundaryAuthoritySchema,
  description: z.string().min(1),
  defaultWriteMode: stateBoundaryWriteModeSchema
});

export const stateBoundaryRoleRuleSchema = z.object({
  role: phaseOwnerSchema,
  mayWriteDirectly: z.array(z.string().min(1)),
  mayPropose: z.array(z.string().min(1)),
  mustNotWrite: z.array(z.string().min(1)),
  evidenceRequiredForAcceptance: z.boolean()
});

export const stateBoundaryContractSchema = z.object({
  version: z.literal(1),
  artifacts: z.array(stateBoundaryArtifactSchema).min(1),
  roleRules: z.array(stateBoundaryRoleRuleSchema).min(1),
  externalAgentDefault: z.object({
    agentKind: z.enum(["external-known", "external-unknown"]),
    writeMode: z.literal("proposal"),
    mayRead: z.array(stateBoundaryLayerSchema).min(1),
    mustNotWriteDirectly: z.array(stateBoundaryLayerSchema).min(1)
  }),
  recoveryTriggers: z.array(z.string().min(1)).min(1)
}).superRefine((value, context) => {
  const artifactPaths = new Set<string>();

  for (const [index, artifact] of value.artifacts.entries()) {
    if (artifactPaths.has(artifact.path)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["artifacts", index, "path"],
        message: "artifact paths must be unique"
      });
    }
    artifactPaths.add(artifact.path);

    if (
      artifact.layer === "committed-truth" &&
      artifact.authority !== "authoritative"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["artifacts", index, "authority"],
        message: "committed truth artifacts must be authoritative"
      });
    }

    if (artifact.layer === "derived-packet" && artifact.authority !== "derived") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["artifacts", index, "authority"],
        message: "derived packet artifacts must be derived"
      });
    }
  }

  const roles = new Set<string>();
  for (const [index, rule] of value.roleRules.entries()) {
    if (roles.has(rule.role)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["roleRules", index, "role"],
        message: "role rules must be unique per role"
      });
    }
    roles.add(rule.role);
  }

  if (!value.roleRules.some((rule) => rule.role === "verifier")) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["roleRules"],
      message: "state boundary contract must include verifier write rules"
    });
  }

  if (!value.roleRules.some((rule) => rule.role === "closeout")) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["roleRules"],
      message: "state boundary contract must include closeout write rules"
    });
  }

  if (value.externalAgentDefault.mustNotWriteDirectly.includes("derived-packet")) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["externalAgentDefault", "mustNotWriteDirectly"],
      message:
        "external agents may create derived packet proposals; the direct-write ban should target authoritative layers"
    });
  }
});

export type StateBoundaryAgentKind = z.infer<typeof stateBoundaryAgentKindSchema>;
export type StateBoundaryArtifact = z.infer<typeof stateBoundaryArtifactSchema>;
export type StateBoundaryAuthority = z.infer<typeof stateBoundaryAuthoritySchema>;
export type StateBoundaryContract = z.infer<typeof stateBoundaryContractSchema>;
export type StateBoundaryLayer = z.infer<typeof stateBoundaryLayerSchema>;
export type StateBoundaryRoleRule = z.infer<typeof stateBoundaryRoleRuleSchema>;
export type StateBoundaryWriteMode = z.infer<typeof stateBoundaryWriteModeSchema>;

export const defaultStateBoundaryContract = stateBoundaryContractSchema.parse({
  version: 1,
  artifacts: [
    {
      path: "AGENTS.md",
      layer: "project-constitution",
      authority: "authoritative",
      description:
        "Project-level constitution: purpose, non-goals, architecture boundaries, risk rules, verification expectations, and human confirmation gates.",
      defaultWriteMode: "proposal"
    },
    {
      path: ".threadsmith/project-brief.json",
      layer: "committed-truth",
      authority: "authoritative",
      description: "Project goal, current scope, non-goals, constraints, priorities, and strategic questions.",
      defaultWriteMode: "direct"
    },
    {
      path: ".threadsmith/project-status.json",
      layer: "committed-truth",
      authority: "authoritative",
      description: "Current track, focus, latest accepted slice, next planned slice, and top risks.",
      defaultWriteMode: "direct"
    },
    {
      path: ".threadsmith/project-roadmap.json",
      layer: "committed-truth",
      authority: "authoritative",
      description: "Version route, milestones, current milestone, and next milestone.",
      defaultWriteMode: "direct"
    },
    {
      path: ".threadsmith/current-phase.json",
      layer: "committed-truth",
      authority: "authoritative",
      description: "Current phase contract: goal, deliverable, scope, stop condition, verification, and owners.",
      defaultWriteMode: "direct"
    },
    {
      path: ".threadsmith/acceptance-state.json",
      layer: "committed-truth",
      authority: "authoritative",
      description: "Current claim, done-when checklist, implementation/review/verification state, and final state.",
      defaultWriteMode: "direct"
    },
    {
      path: ".threadsmith/active-work.json",
      layer: "committed-truth",
      authority: "authoritative",
      description: "Role-by-role active work, status, user-decision needs, and blocker summary.",
      defaultWriteMode: "direct"
    },
    {
      path: ".threadsmith/project-supervision.json",
      layer: "committed-truth",
      authority: "authoritative",
      description: "Multi-role supervision state, role lines, providers, task summaries, and current collaboration mode.",
      defaultWriteMode: "direct"
    },
    {
      path: ".threadsmith/preferences.json",
      layer: "committed-truth",
      authority: "authoritative",
      description: "Project-level Threadsmith preferences and durable operator decisions.",
      defaultWriteMode: "direct"
    },
    {
      path: ".threadsmith/provider-routing.json",
      layer: "committed-truth",
      authority: "authoritative",
      description: "Provider routing defaults and supported ownership display for the project.",
      defaultWriteMode: "direct"
    },
    {
      path: ".threadsmith/command-bridge.json",
      layer: "committed-truth",
      authority: "authoritative",
      description: "Latest accepted command bridge route and run summary written back as project truth.",
      defaultWriteMode: "direct"
    },
    {
      path: ".threadsmith/skill-routing.json",
      layer: "committed-truth",
      authority: "authoritative",
      description: "Skill routing defaults, adapter declarations, and fallback policy for the project.",
      defaultWriteMode: "direct"
    },
    {
      path: ".threadsmith/context/current-packet.json",
      layer: "derived-packet",
      authority: "derived",
      description: "Compact projection derived from committed truth and repo signals for continuation.",
      defaultWriteMode: "proposal"
    },
    {
      path: ".threadsmith/context/role-packets/<role>.json",
      layer: "derived-packet",
      authority: "derived",
      description: "Role-scoped packet derived from committed truth for planner, executor, reviewer, verifier, closeout, or hygiene work.",
      defaultWriteMode: "proposal"
    },
    {
      path: ".threadsmith/context/repo-map.json",
      layer: "derived-packet",
      authority: "derived",
      description: "Repo structure projection used to orient agents without treating a summary as truth.",
      defaultWriteMode: "proposal"
    },
    {
      path: ".threadsmith/context/evidence-summary.json",
      layer: "evidence",
      authority: "proof",
      description: "Verification command summaries, artifact refs, and failure focus used as proof layer.",
      defaultWriteMode: "proposal"
    },
    {
      path: ".threadsmith/events.ndjson",
      layer: "audit",
      authority: "audit",
      description: "Append-only workflow event stream used to explain how the current truth was reached.",
      defaultWriteMode: "proposal"
    },
    {
      path: ".threadsmith/action-queue.ndjson",
      layer: "audit",
      authority: "audit",
      description: "Queued deck/action bridge requests used as audit and recovery context.",
      defaultWriteMode: "proposal"
    },
    {
      path: ".threadsmith/runs/",
      layer: "runtime-artifact",
      authority: "runtime",
      description: "Executor run packets, prompts, stdout, stderr, status, results, and local execution artifacts.",
      defaultWriteMode: "proposal"
    },
    {
      path: ".threadsmith/handoff/current-agent-handoff.md",
      layer: "derived-packet",
      authority: "derived",
      description: "Readable handoff projection for another agent; never the authority over committed truth.",
      defaultWriteMode: "proposal"
    },
    {
      path: ".threadsmith/adapters/*.md",
      layer: "derived-packet",
      authority: "derived",
      description: "Provider-neutral or provider-specific adapter prompts derived from the state boundary and current project truth.",
      defaultWriteMode: "proposal"
    },
    {
      path: ".threadsmith/proposals/<proposal-id>.json",
      layer: "runtime-artifact",
      authority: "runtime",
      description: "Structured writeback proposal from an external or native agent; never accepted committed truth until reviewed and verified.",
      defaultWriteMode: "proposal"
    }
  ],
  roleRules: [
    {
      role: "planner",
      mayWriteDirectly: [
        ".threadsmith/current-phase.json",
        ".threadsmith/project-status.json",
        ".threadsmith/active-work.json",
        ".threadsmith/project-supervision.json"
      ],
      mayPropose: [
        ".threadsmith/project-brief.json",
        ".threadsmith/project-roadmap.json"
      ],
      mustNotWrite: [
        ".threadsmith/context/evidence-summary.json",
        ".threadsmith/acceptance-state.json#verificationStatus",
        ".threadsmith/acceptance-state.json#finalState=accepted"
      ],
      evidenceRequiredForAcceptance: false
    },
    {
      role: "executor",
      mayWriteDirectly: [
        "source files",
        "test files",
        ".threadsmith/active-work.json"
      ],
      mayPropose: [
        ".threadsmith/acceptance-state.json#implementationStatus",
        ".threadsmith/project-supervision.json"
      ],
      mustNotWrite: [
        ".threadsmith/acceptance-state.json#reviewStatus=passed",
        ".threadsmith/acceptance-state.json#verificationStatus=passed",
        ".threadsmith/acceptance-state.json#finalState=accepted"
      ],
      evidenceRequiredForAcceptance: false
    },
    {
      role: "reviewer",
      mayWriteDirectly: [
        ".threadsmith/acceptance-state.json#reviewStatus",
        ".threadsmith/active-work.json",
        ".threadsmith/project-supervision.json"
      ],
      mayPropose: [
        ".threadsmith/context/evidence-summary.json",
        ".threadsmith/acceptance-state.json#knownGaps"
      ],
      mustNotWrite: [
        ".threadsmith/acceptance-state.json#verificationStatus=passed",
        ".threadsmith/acceptance-state.json#finalState=accepted"
      ],
      evidenceRequiredForAcceptance: false
    },
    {
      role: "verifier",
      mayWriteDirectly: [
        ".threadsmith/context/evidence-summary.json",
        ".threadsmith/acceptance-state.json#verificationStatus",
        ".threadsmith/active-work.json"
      ],
      mayPropose: [
        ".threadsmith/acceptance-state.json#finalState=accepted-with-closeout-pending"
      ],
      mustNotWrite: [
        "source files",
        ".threadsmith/acceptance-state.json#finalState=accepted"
      ],
      evidenceRequiredForAcceptance: true
    },
    {
      role: "closeout",
      mayWriteDirectly: [
        ".threadsmith/acceptance-state.json#finalState",
        ".threadsmith/project-status.json#latestAcceptedSlice",
        ".threadsmith/project-status.json#nextPlannedSlice",
        ".threadsmith/active-work.json"
      ],
      mayPropose: [
        ".threadsmith/current-phase.json",
        ".threadsmith/project-roadmap.json"
      ],
      mustNotWrite: [
        "source files",
        "new implementation scope"
      ],
      evidenceRequiredForAcceptance: true
    },
    {
      role: "hygiene",
      mayWriteDirectly: [
        ".threadsmith/context/current-packet.json",
        ".threadsmith/context/role-packets/<role>.json",
        ".threadsmith/handoff/current-agent-handoff.md"
      ],
      mayPropose: [
        ".threadsmith/project-brief.json",
        ".threadsmith/current-phase.json",
        ".threadsmith/acceptance-state.json",
        ".threadsmith/project-status.json"
      ],
      mustNotWrite: [
        ".threadsmith/acceptance-state.json#finalState=accepted without evidence",
        "source files without an executor route"
      ],
      evidenceRequiredForAcceptance: false
    }
  ],
  externalAgentDefault: {
    agentKind: "external-unknown",
    writeMode: "proposal",
    mayRead: [
      "project-constitution",
      "committed-truth",
      "derived-packet",
      "evidence",
      "audit"
    ],
    mustNotWriteDirectly: ["project-constitution", "committed-truth"]
  },
  recoveryTriggers: [
    "AGENTS.md and .threadsmith truth disagree",
    "current phase changed after a handoff packet was generated",
    "acceptance claim does not match evidence",
    "an agent proposes final acceptance without verification evidence",
    "two agents update the same truth object with different phase ids",
    "git diff exists but acceptance says accepted",
    "packet freshness cannot be proven for a high-risk action"
  ]
});

export function artifactsForLayer(
  contract: StateBoundaryContract,
  layer: StateBoundaryLayer
): StateBoundaryArtifact[] {
  return contract.artifacts.filter((artifact) => artifact.layer === layer);
}

export function roleRuleFor(
  contract: StateBoundaryContract,
  role: StateBoundaryRoleRule["role"]
): StateBoundaryRoleRule {
  const rule = contract.roleRules.find((candidate) => candidate.role === role);

  if (!rule) {
    throw new Error(`Missing state boundary rule for role "${role}"`);
  }

  return rule;
}

export function defaultWriteModeForAgent(args: {
  artifact: StateBoundaryArtifact;
  agentKind: StateBoundaryAgentKind;
}): StateBoundaryWriteMode {
  if (args.agentKind === "threadsmith-native") {
    return args.artifact.defaultWriteMode;
  }

  if (args.artifact.layer === "project-constitution") {
    return "proposal";
  }

  if (args.artifact.layer === "committed-truth") {
    return "proposal";
  }

  return args.artifact.defaultWriteMode === "direct"
    ? "proposal"
    : args.artifact.defaultWriteMode;
}
