import {
  type ContextReference,
  type ExecutionPacket,
  type PhaseOwner,
  type ProviderId,
  type VerificationPolicyDecision,
  executionPacketSchema
} from "@threadsmith/domain";
import {
  buildMiniProtocolInstruction,
  resolveSkillRoute
} from "@threadsmith/runtime";
import type { RoleExecutionRequest } from "./providerTypes.ts";
import { decideVerificationPolicy } from "./verificationPolicy.ts";
import {
  builtInOnlyOrchestratorConfig,
  protocolCapabilityForRole
} from "./roleOrchestratorDefaults.ts";
import { buildRolePacketContext } from "./rolePacketBuildContext.ts";
import { buildRolePacketSpec } from "./rolePacketSpecs.ts";
import { rolePromptContractFor } from "./rolePromptContracts.ts";
import {
  currentContextPacketRef,
  roleContextPacketRef,
  roleContextRefs
} from "./rolePacketContextRefs.ts";

function defaultOutput(runId: string) {
  return {
    resultPath: `.threadsmith/runs/${runId}/result.json`,
    summaryPath: `.threadsmith/runs/${runId}/result.md`
  };
}

function packetContextLines(contextRefs: ContextReference[]) {
  return contextRefs.length > 0
    ? contextRefs
        .map((ref) => `- [${ref.kind}] ${ref.path}${ref.title ? ` (${ref.title})` : ""}`)
        .join("\n")
    : "- 无额外上下文引用";
}

function packetProtocolLines(packet: ExecutionPacket) {
  const instruction = packet.protocolInstruction;

  if (!instruction) {
    return ["- 未附加 mini protocol instruction"];
  }

  const route = instruction.route;
  return [
    `- Protocol: ${instruction.protocol.id} (${instruction.protocol.label})`,
    `- Source: ${route.source}`,
    `- Adapter: ${route.selectedAdapterId ?? "none"}`,
    `- Availability: ${route.availability}`,
    `- Route reason: ${route.reason}`,
    `- Stop condition: ${instruction.stopCondition}`,
    `- Continuation hint: ${instruction.continuationHint}`,
    "- Required inputs:",
    ...instruction.inputChecklist.map((item) => `  - ${item}`),
    "- Required outputs:",
    ...instruction.outputChecklist.map((item) => `  - ${item}`),
    "- Protocol guardrails:",
    ...instruction.guardrails.map((item) => `  - ${item}`),
    ...(route.safetyWarnings.length > 0
      ? [
          "- Safety warnings:",
          ...route.safetyWarnings.map((item) => `  - ${item}`)
        ]
      : [])
  ];
}

function packetListLines(items: string[], emptyText: string) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${emptyText}`;
}

function packetVerificationPolicyLines(policy: ExecutionPacket["verificationPolicy"]) {
  if (!policy) {
    return ["- 未附加 verification policy"];
  }

  return [
    `- Level: ${policy.recommendedLevel}`,
    `- Reason: ${policy.reason}`,
    "- Required checks:",
    ...policy.requiredChecks.map((item) => `  - ${item}`),
    "- Escalation signals:",
    ...(policy.escalationSignals.length > 0
      ? policy.escalationSignals.map((item) => `  - ${item}`)
      : ["  - none"])
  ];
}

function renderRoleHeader(packet: ExecutionPacket) {
  return [
    `你正在执行一条 Threadsmith ${packet.role} packet。`,
    "",
    "通用要求：",
    "- 先阅读引用的 committed truth 与必要文件，再行动。",
    "- 不要输出阶段性自然语言汇报；读取、执行、验证后直接结束。",
    "- 最后一条消息必须是符合 schema 的结构化 JSON。",
    "- 不要宣称成功，除非你真的得到了对应证据。"
  ];
}

export function renderRolePrompt(packet: ExecutionPacket) {
  const rules = rolePromptContractFor(packet.role);
  const decisionLines =
    rules.decisions.length > 0
      ? rules.decisions.map((item) => `- ${item}`)
      : ["- 本角色不要求额外 decision 字段"];

  return [
    ...renderRoleHeader(packet),
    "",
    "角色边界：",
    ...rules.contract.map((line) => `- ${line}`),
    "",
    `Run ID: ${packet.runId}`,
    `Project Root: ${packet.projectRoot}`,
    `Role: ${packet.role}`,
    `Provider: ${packet.provider}`,
    "",
    "Objective:",
    packet.objective,
    "",
    "Scope:",
    packetListLines(packet.scope, "本轮没有额外 scope"),
    "",
    "Done When:",
    packetListLines(packet.doneWhen, "本轮没有额外 done when"),
    "",
    "Verification:",
    packetListLines(packet.verification, "本轮没有额外验证命令"),
    "",
    "Verification Policy:",
    ...packetVerificationPolicyLines(packet.verificationPolicy),
    "",
    "Context Refs:",
    packetContextLines(packet.contextRefs),
    "",
    "Mini Protocol Instruction:",
    ...packetProtocolLines(packet),
    "",
    "Allowed decision values:",
    ...decisionLines,
    "",
    "Final output contract:",
    "- 必填：summary、changedFiles、verification、evidenceRefs。",
    "- `decision`、`sliceRef`、`pauseRecommendation`、`riskHits`、`blocker` 这几个 key 也会出现在 JSON 里；如果不适用请显式填 `null`。",
    `- 结果会保存到 ${packet.output.resultPath}。`,
    "- 只有在确有需要时才填写具体值；否则填 `null`。"
  ].join("\n");
}

function buildRolePacket(input: {
  projectRoot: string;
  runId: string;
  provider: ProviderId;
  role: PhaseOwner;
  objective: string;
  scope: string[];
  doneWhen: string[];
  verification: string[];
  verificationPolicy?: VerificationPolicyDecision;
  contextRefs: ContextReference[];
}): ExecutionPacket {
  const route = resolveSkillRoute({
    role: input.role,
    requestedCapability: protocolCapabilityForRole(input.role),
    config: builtInOnlyOrchestratorConfig()
  });

  return executionPacketSchema.parse({
    runId: input.runId,
    projectRoot: input.projectRoot,
    role: input.role,
    provider: input.provider,
    objective: input.objective,
    scope: input.scope,
    doneWhen: input.doneWhen,
    verification: input.verification,
    verificationPolicy: input.verificationPolicy,
    protocolInstruction: buildMiniProtocolInstruction({
      route,
      role: input.role,
      objective: input.objective
    }),
    contextRefs: [
      currentContextPacketRef(),
      roleContextPacketRef(input.role),
      ...input.contextRefs
    ],
    output: defaultOutput(input.runId)
  });
}

export async function buildPacketForRole(
  input: RoleExecutionRequest
): Promise<ExecutionPacket> {
  const {
    state,
    recentEvents,
    latestRuns,
    phaseRefs,
    evidenceBundle
  } = await buildRolePacketContext(input.projectRoot);
  const evidenceRefs = evidenceBundle ? [evidenceBundle.ref] : [];
  const verificationPolicy =
    evidenceBundle?.bundle.verification ??
    decideVerificationPolicy({
      phase: state.currentPhase,
      acceptance: state.acceptanceState,
      changedFiles: [],
      commands: state.currentPhase.verificationForThisPhase
    });
  const contextRefs = roleContextRefs({
    role: input.role,
    events: recentEvents,
    phaseRefs,
    evidenceRefs,
    latestRuns
  });
  const spec = buildRolePacketSpec({
    role: input.role,
    state
  });

  return buildRolePacket({
    projectRoot: input.projectRoot,
    runId: input.runId,
    provider: input.provider,
    role: spec.role,
    objective: spec.objective,
    scope: spec.scope,
    doneWhen: spec.doneWhen,
    verification: spec.verification,
    verificationPolicy: spec.role === "verifier" ? verificationPolicy : undefined,
    contextRefs
  });
}

export async function buildPlannerPacket(
  projectRoot: string,
  runId: string,
  provider: ProviderId = "codex"
) {
  return buildPacketForRole({
    projectRoot,
    runId,
    provider,
    role: "planner"
  });
}

export async function buildExecutorPacket(
  projectRoot: string,
  runId: string,
  provider: ProviderId = "codex"
) {
  return buildPacketForRole({
    projectRoot,
    runId,
    provider,
    role: "executor"
  });
}

export async function buildReviewerPacket(
  projectRoot: string,
  runId: string,
  provider: ProviderId = "codex"
) {
  return buildPacketForRole({
    projectRoot,
    runId,
    provider,
    role: "reviewer"
  });
}

export async function buildVerifierPacket(
  projectRoot: string,
  runId: string,
  provider: ProviderId = "codex"
) {
  return buildPacketForRole({
    projectRoot,
    runId,
    provider,
    role: "verifier"
  });
}

export async function buildCloseoutPacket(
  projectRoot: string,
  runId: string,
  provider: ProviderId = "codex"
) {
  return buildPacketForRole({
    projectRoot,
    runId,
    provider,
    role: "closeout"
  });
}

export const renderExecutorPrompt = renderRolePrompt;
