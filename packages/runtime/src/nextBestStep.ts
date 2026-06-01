import type { AgentRunRecord, ProjectState } from "@threadsmith/domain";
import type { LatestContinuationState } from "./continuationState.ts";
import { acceptedStateRecommendation } from "./nextBestStepAccepted.ts";
import type {
  ConcreteNextStep,
  NextBestStepDecision,
  RolePacketPolicy,
  SurfaceAudience,
  WorkType,
  WorkVisibility
} from "./nextBestStepModel.ts";
import { recommendation } from "./nextBestStepModel.ts";
import {
  createMissingPhasePauseSummary,
  createMissingPhaseRunSummary,
  type PhasePauseSummary,
  type PhaseRunSummary
} from "./phaseRun.ts";
import type { ContextRecoverySignal } from "./contextRecovery.ts";

export type {
  ActionRecommendation,
  NextStepKind,
  OperatingMode,
  WritebackTier,
  RuntimeVerificationLevel,
  SurfaceAudience,
  WorkVisibility,
  RolePacketPolicy,
  WorkType,
  ConcreteNextStep,
  NextBestStepDecision,
  RuntimeActionId
} from "./nextBestStepModel.ts";

export type CloseoutTier = "lite" | "standard" | "audit";

export interface AdaptiveWorkSessionSignals {
  previousGapCheckSelectedImplementationPath?: boolean;
  closeoutTiersSinceValueHeartbeat?: CloseoutTier[];
  requiresAuditStop?: boolean;
  auditStopReason?: string;
  introducesConsumerSurface?: boolean;
  changesProductSemantics?: boolean;
  surfaceAudience?: SurfaceAudience;
  workVisibility?: WorkVisibility;
  changesWorkflowSemantics?: boolean;
  createsLongLivedOperatorOrPublicEntry?: boolean;
  changesDefaultBehavior?: boolean;
  compatibilityRisk?: boolean;
  publicMisuseRisk?: boolean;
  workBundleCandidate?: boolean;
  workBundleActionCount?: number;
  rollingCloseoutAuthorized?: boolean;
  repeatedGapChecks?: boolean;
  repeatedInternalOnlyCount?: number;
  workType?: WorkType;
  diagnosticStreakCount?: number;
  diagnosticSupportsCapability?: string;
  diagnosticBudgetOverrideReason?: string;
  lightRepair?: boolean;
  lightRepairReason?: string;
  legacyMetadataMissing?: boolean;
  legacyMetadataSafe?: boolean;
}

function defaultVisibilityForAudience(
  surfaceAudience: SurfaceAudience
): WorkVisibility {
  switch (surfaceAudience) {
    case "developer":
      return "developer_visible";
    case "operator":
      return "operator_visible";
    case "user_public":
      return "user_visible";
    case "internal":
    default:
      return "internal";
  }
}

function resolveSurfaceMetadata(signals: AdaptiveWorkSessionSignals = {}) {
  const surfaceAudience = signals.surfaceAudience ?? "internal";

  return {
    surfaceAudience,
    workVisibility:
      signals.workVisibility ?? defaultVisibilityForAudience(surfaceAudience)
  };
}

function appendIfMissing(base: string, fragment: string) {
  return base.includes(fragment) ? base : `${base} ${fragment}`.trim();
}

function formatRunningRole(role: string) {
  switch (role) {
    case "executor":
      return "执行";
    case "reviewer":
      return "评审";
    case "verifier":
      return "验证";
    case "closeout":
      return "收尾";
    case "hygiene":
      return "整理";
    default:
      return "工作流";
  }
}

function isReportingFailureAfterSuccessfulTask(latestRun: AgentRunRecord | null) {
  return (
    latestRun?.status === "failed" &&
    latestRun.taskOutcome === "succeeded" &&
    latestRun.failureStage === "result-reporting"
  );
}

function findPendingUserDecision(state: ProjectState) {
  return state.activeWork.items.find(
    (item) =>
      item.requiresUserDecision &&
      state.currentPhase.activeOwners.includes(item.role)
  );
}

function isAuditStopRequired(signals: AdaptiveWorkSessionSignals) {
  return Boolean(
    signals.requiresAuditStop ||
      signals.introducesConsumerSurface ||
      signals.changesProductSemantics ||
      signals.workVisibility === "user_visible" ||
      signals.surfaceAudience === "user_public" ||
      (signals.surfaceAudience === "operator" &&
        (signals.changesWorkflowSemantics ||
          signals.createsLongLivedOperatorOrPublicEntry ||
          signals.changesDefaultBehavior ||
          signals.compatibilityRisk ||
          signals.publicMisuseRisk))
  );
}

function auditStopReason(signals: AdaptiveWorkSessionSignals) {
  if (signals.auditStopReason?.trim()) {
    return signals.auditStopReason.trim();
  }

  if (signals.introducesConsumerSurface) {
    return "下一步会暴露新的 consumer surface，不能悄悄并入 work session。";
  }

  if (signals.changesProductSemantics) {
    return "下一步会改变 product semantics，必须先停在 phase 边界确认。";
  }

  if (signals.surfaceAudience === "user_public") {
    return "下一步会影响 user/public surface，必须先确认兼容性、验收和 stop condition。";
  }

  if (signals.workVisibility === "user_visible") {
    return "下一步虽然入口不一定是 public surface，但结果已经会影响 user-visible behavior，必须先确认兼容性、验收和 stop condition。";
  }

  if (signals.surfaceAudience === "operator") {
    return "下一步会改变 operator surface 的长期用法或默认行为，必须先确认 workflow 语义。";
  }

  return "下一步触发 audit stop gate，必须先确认边界。";
}

function hasThreeConsecutiveGovernanceHeavyCloseouts(
  closeoutTiers: CloseoutTier[] = []
) {
  const lastThree = closeoutTiers.slice(-3);

  return (
    lastThree.length === 3 &&
    lastThree.every((tier) => tier === "standard" || tier === "audit")
  );
}

function shouldRecommendValueCheckpoint(signals: AdaptiveWorkSessionSignals) {
  return (
    hasThreeConsecutiveGovernanceHeavyCloseouts(
      signals.closeoutTiersSinceValueHeartbeat
    ) ||
    (signals.repeatedInternalOnlyCount ?? 0) >= 3 ||
    Boolean(signals.repeatedGapChecks) ||
    (signals.workType === "diagnostic" &&
      (signals.diagnosticStreakCount ?? 0) >= 3 &&
      !signals.diagnosticBudgetOverrideReason?.trim()) ||
    (signals.workBundleCandidate && (signals.workBundleActionCount ?? 0) > 4) ||
    (signals.rollingCloseoutAuthorized &&
      (signals.workBundleActionCount ?? 0) >= 4)
  );
}

function concreteNextStep(
  target: string,
  objective: string,
  verification: string,
  stopCondition: string
): ConcreteNextStep {
  return {
    target,
    objective,
    verification,
    stopCondition
  };
}

function canContinueWorkSession(state: ProjectState, pendingUserDecision: unknown) {
  return (
    !pendingUserDecision &&
    state.currentPhase.blockedBy.length === 0 &&
    !state.activeWork.blockerSummary &&
    state.acceptanceState.verificationStatus !== "failed" &&
    state.acceptanceState.reviewStatus !== "review-blocked"
  );
}

function normalImplementationMetadata(
  capabilityTranslation: string,
  surfaceAudience: SurfaceAudience = "internal",
  workVisibility: WorkVisibility = defaultVisibilityForAudience(surfaceAudience),
  rolePacketPolicy: RolePacketPolicy = "skip-daily",
  workType: WorkType = "capability",
  extraMetadata: {
    diagnosticSupportCapability?: string;
    diagnosticStreakCount?: number;
    diagnosticBudgetOverrideReason?: string;
    concreteNextStep?: ConcreteNextStep;
  } = {}
) {
  const {
    concreteNextStep: explicitConcreteNextStep,
    ...restMetadata
  } = extraMetadata;

  return {
    operatingMode: "normal-implementation" as const,
    writebackTier: "current-context" as const,
    verificationLevel: "standard" as const,
    outputBudget: "standard" as const,
    outputShape: "progress-card" as const,
    rolePacketPolicy,
    writebackStatusVisibility: "optional" as const,
    workType,
    ...restMetadata,
    concreteNextStep:
      explicitConcreteNextStep ??
      concreteNextStep(
        "current accepted implementation surface",
        capabilityTranslation,
        "run the relevant focused checks for the touched package or contract",
        "stop for public/user-facing semantics, provider/default changes, destructive action, failed verification, stale truth, or release/merge work"
      ),
    surfaceAudience,
    workVisibility,
    affectedLayer: "runtime recommendation",
    capabilityTranslation
  };
}

function fullGovernanceMetadata(
  capabilityTranslation: string,
  audience: SurfaceAudience = "operator",
  visibility: WorkVisibility = "operator_visible"
) {
  return {
    operatingMode: "full-governance" as const,
    writebackTier: "committed-truth" as const,
    verificationLevel: "release" as const,
    outputBudget: "audit" as const,
    outputShape: "audit-skeleton" as const,
    rolePacketPolicy: "refresh-durable" as const,
    writebackStatusVisibility: "required" as const,
    workType: "governance" as const,
    concreteNextStep: concreteNextStep(
      "phase contract / governance boundary",
      capabilityTranslation,
      "confirm scope, acceptance, and release/audit evidence before execution",
      "operator approval is required before crossing this stop gate"
    ),
    surfaceAudience: audience,
    workVisibility: visibility,
    affectedLayer: "governance boundary",
    capabilityTranslation
  };
}

function lightRepairMetadata(capabilityTranslation: string) {
  return {
    operatingMode: "light-repair" as const,
    writebackTier: "evidence-only" as const,
    verificationLevel: "narrow" as const,
    outputBudget: "lite" as const,
    outputShape: "progress-card" as const,
    rolePacketPolicy: "skip-daily" as const,
    writebackStatusVisibility: "omit" as const,
    workType: "maintenance" as const,
    concreteNextStep: concreteNextStep(
      "focused changed surface",
      capabilityTranslation,
      "run narrow verification for the touched surface",
      "stop if the repair changes durable acceptance, public behavior, or scope"
    ),
    surfaceAudience: "internal" as const,
    workVisibility: "internal" as const,
    affectedLayer: "focused repair",
    capabilityTranslation
  };
}

function auditStopMetadata(
  signals: AdaptiveWorkSessionSignals,
  capabilityTranslation: string
) {
  if (signals.introducesConsumerSurface || signals.changesProductSemantics) {
    return fullGovernanceMetadata(
      capabilityTranslation,
      "user_public",
      "user_visible"
    );
  }

  if (signals.surfaceAudience === "user_public") {
    return fullGovernanceMetadata(
      capabilityTranslation,
      "user_public",
      signals.workVisibility ?? "user_visible"
    );
  }

  if (signals.workVisibility === "user_visible") {
    return fullGovernanceMetadata(
      capabilityTranslation,
      signals.surfaceAudience ?? "user_public",
      "user_visible"
    );
  }

  if (signals.surfaceAudience === "operator") {
    return fullGovernanceMetadata(
      capabilityTranslation,
      "operator",
      signals.workVisibility ?? "operator_visible"
    );
  }

  return fullGovernanceMetadata(capabilityTranslation);
}

function isBootstrapDecisionStage(
  state: ProjectState,
  latestRun: AgentRunRecord | null,
  latestPhaseRun: PhaseRunSummary
) {
  return (
    latestRun === null &&
    latestPhaseRun.status === "missing" &&
    state.acceptanceState.implementationStatus === "not-started" &&
    state.acceptanceState.reviewStatus === "not-started" &&
    state.acceptanceState.verificationStatus === "not-started" &&
    state.currentPhase.activeOwners.every((role) => role === "planner") &&
    Boolean(findPendingUserDecision(state))
  );
}

export function selectNextBestStep(
  state: ProjectState,
  latestContinuationState: LatestContinuationState = {
    status: "missing",
    kind: null,
    freshness: null,
    headline: "还没有 handoff 或 hygiene packet",
    detail: "运行 hygiene 或创建 handoff，把当前 Threadsmith truth 收进可复用的 packet。",
    freshnessDetail: null,
    recordedAt: null
  },
  latestRun: AgentRunRecord | null = null,
  latestPhaseRun: PhaseRunSummary = createMissingPhaseRunSummary(),
  latestPhasePause: PhasePauseSummary = createMissingPhasePauseSummary(),
  contextRecovery: ContextRecoverySignal | null = null,
  adaptiveSignals: AdaptiveWorkSessionSignals = {}
): NextBestStepDecision {
  if (latestPhaseRun.status === "paused") {
    const pauseReason = latestPhasePause.summary
      ? `自动链路当前需要你介入：${latestPhasePause.summary}`
      : latestPhaseRun.operatorDetail;
    const recoveryReason = latestPhaseRun.resumeHint
      ? appendIfMissing(
          pauseReason,
          "请先补齐恢复条件，再回到指挥入口 continue 当前自动链路。"
        )
      : pauseReason;

    return {
      primary: recommendation(
        "open-current-phase",
        "先处理恢复条件",
        recoveryReason,
        [latestPhaseRun.currentRole ?? "planner"],
        latestPhaseRun.resumeHint
          ? "恢复条件已满足，并且已经回到指挥入口显式 continue 当前自动链路。"
          : "暂停原因已被处理，自动链路可以安全继续。"
      ),
      alternatives: [
        recommendation(
          "run-hygiene",
          "暂停后先重新锚定",
          "如果暂停暴露出范围漂移或上下文污染，先做一次 hygiene 会更稳。",
          ["hygiene"],
          "当前 truth、暂停原因和恢复条件已经重新拆开。"
        ),
        recommendation(
          "create-handoff",
          "为暂停态创建恢复点",
          "如果你想先留一个更干净的恢复边界，这会很有用。",
          ["hygiene"],
          "已经存在一个最新 continuation packet。"
        )
      ]
    };
  }

  if (latestPhaseRun.status === "running") {
    const roleLabel = latestPhaseRun.currentRoleLabel ?? "自动链路";
    return {
      primary: recommendation(
        "open-current-phase",
        "等待自动链路结果回流",
        latestPhaseRun.operatorDetail,
        [latestPhaseRun.currentRole ?? "planner"],
        "这轮 automatic chain 写回 committed truth，或进入新的暂停 / 失败状态。"
      ),
      alternatives: [
        recommendation(
          "run-hygiene",
          "等待结果前先重新锚定",
          "如果你担心线程继续变重，先做一次 hygiene 会更稳。",
          ["hygiene"],
          "当前 truth 与下一步边界已经重新清晰化。"
        ),
        recommendation(
          "create-handoff",
          "为当前执行创建恢复点",
          "如果你需要为这轮 automatic chain 留一个干净恢复点，可以先做 handoff。",
          ["hygiene"],
          "已经存在一个最新 continuation packet。"
        )
      ]
    };
  }

  if (latestRun?.status === "running") {
    const roleLabel = formatRunningRole(latestRun.role);
    return {
      primary: recommendation(
        "open-current-phase",
        `等待${roleLabel}结果回流`,
        latestRun.statusDetail?.trim()
          ? `${latestRun.statusDetail.trim()} 当前无需重新签发动作，先等待结果回流到 committed truth，等 committed truth 更新后再判断下一步。`
          : `${latestRun.provider} 已经在执行当前 ${latestRun.role} 任务，当前无需重新签发动作，先等待结果回流到 committed truth，等 committed truth 更新后再判断下一步。`,
        [latestRun.role],
        "这轮自动执行完成，并把结果写回当前项目 truth。"
      ),
      alternatives: [
        recommendation(
          "run-hygiene",
          "等待结果前先重新锚定",
          "如果你担心线程继续变重，先做一次 hygiene 会更稳。",
          ["hygiene"],
          "当前 truth 与下一步边界已经重新清晰化。"
        ),
        recommendation(
          "create-handoff",
          "为当前执行创建恢复点",
          "如果你需要为这轮自动执行保留一个干净恢复点，可以先做 handoff。",
          ["hygiene"],
          "已经存在一个最新 continuation packet。"
        )
      ]
    };
  }

  if (latestRun?.status === "failed") {
    if (isReportingFailureAfterSuccessfulTask(latestRun)) {
      return {
        primary: recommendation(
          "advance-phase",
          "处理结果上报失败",
          latestRun.statusDetail?.trim()
            ? `最新自动执行的任务体已完成，但结果上报失败：${latestRun.statusDetail.trim()}`
            : "最新自动执行的任务体已完成，但结果没有成功回流；现在最有价值的动作是先处理 bridge / CLI 上报问题。",
          ["planner", "executor"],
          "结果上报问题已被定位或修复，最新运行 truth 与任务体真实状态重新一致。"
        ),
        alternatives: [
          recommendation(
            "open-current-phase",
            "查看当前 phase 边界",
            "先确认这轮任务主体完成了什么、哪些证据已可信，再决定如何修复回流问题。",
            ["planner"],
            "phase contract、最新证据与修复目标重新对齐。"
          ),
          recommendation(
            "run-hygiene",
            "失败后先重新锚定",
            "如果这次上报失败让上下文开始混乱，先做一次 hygiene 会更稳。",
            ["hygiene"],
            "已把任务主体结果、上报失败原因与下一步修复动作重新拆开。"
          )
        ]
      };
    }

    return {
      primary: recommendation(
        "advance-phase",
        "修复自动执行失败",
        latestRun.statusDetail?.trim()
          ? `最新自动执行失败：${latestRun.statusDetail.trim()}`
          : "最新自动执行没有完成，因此现在最有价值的动作是做一个窄范围修复 slice。",
        ["planner", "executor"],
        "自动执行失败的原因已被修复，新的候选修改重新准备好进入 review。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "查看当前 phase 边界",
          "先确认这次失败仍然落在当前 slice 范围内，再决定如何修复。",
          ["planner"],
          "phase contract 与修复目标重新对齐。"
        ),
        recommendation(
          "run-hygiene",
          "失败后先重新锚定",
          "如果失败暴露出旧假设或上下文漂移，先做 hygiene 会更稳。",
          ["hygiene"],
          "已把失败原因、当前事实和下一步修复动作重新分开。"
        )
      ]
    };
  }

  if (state.acceptanceState.finalState === "accepted") {
    return acceptedStateRecommendation(latestContinuationState);
  }

  const shouldPrioritizeContextRecovery =
    contextRecovery &&
    (contextRecovery.action === "sync-context" ||
      contextRecovery.action === "run-hygiene" ||
      contextRecovery.action === "review-proposal") &&
    state.activeWork.items.every((item) => item.status !== "running");

  if (shouldPrioritizeContextRecovery && contextRecovery.action === "sync-context") {
    return {
      primary: recommendation(
        "sync-context",
        contextRecovery.currentPacketStatus === "missing"
          ? "生成 Context Packet"
          : "刷新 Context Packet",
        contextRecovery.detail,
        ["hygiene"],
        "Context Packet 与当前 committed truth 重新一致。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "查看当前 phase 边界",
          "在刷新 context 前，先确认当前 phase 与 acceptance 是否就是新的 source of truth。",
          ["planner"],
          "当前 phase、claim 与刷新目标已确认。"
        ),
        recommendation(
          "create-handoff",
          "创建恢复 handoff",
          "如果这个线程已经很长，先保留一个恢复点再同步 context 会更稳。",
          ["hygiene"],
          "已经存在一个可继续的恢复边界。"
        )
      ]
    };
  }

  if (shouldPrioritizeContextRecovery && contextRecovery.action === "run-hygiene") {
    return {
      primary: recommendation(
        "run-hygiene",
        "运行 context hygiene",
        contextRecovery.detail,
        ["hygiene"],
        "过期或矛盾的 context artifact 已被重新锚定。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "检查 packet 来源",
          "先检查 current phase、acceptance 和 role packet 的冲突点。",
          ["planner"],
          "冲突来源已经明确。"
        ),
        recommendation(
          "create-handoff",
          "保存恢复点",
          "如果要切线程或暂停当前工作，先保存一个干净恢复点。",
          ["hygiene"],
          "恢复点已经可供下一轮继续。"
        )
      ]
    };
  }

  if (shouldPrioritizeContextRecovery && contextRecovery.action === "review-proposal") {
    return {
      primary: recommendation(
        "review-proposal",
        "审查 writeback proposal",
        contextRecovery.detail,
        ["hygiene", "reviewer"],
        "proposal 已被明确采纳、拒绝或转成新的安全 recovery 动作。"
      ),
      alternatives: [
        recommendation(
          "run-hygiene",
          "先重新锚定 truth",
          "如果 proposal 与当前 truth 的关系不清楚，先运行 hygiene，把 proposal、committed truth 和证据拆开。",
          ["hygiene"],
          "proposal、truth 和证据边界已经重新清晰。"
        ),
        recommendation(
          "open-current-phase",
          "查看当前 phase 边界",
          "先确认 proposal 是否仍属于当前 phase，避免采纳过期建议。",
          ["planner"],
          "当前 phase 与 proposal 适用范围已经确认。"
        )
      ]
    };
  }

  const pendingUserDecision = findPendingUserDecision(state);

  if (
    adaptiveSignals.legacyMetadataMissing &&
    adaptiveSignals.legacyMetadataSafe === false
  ) {
    return {
      primary: recommendation(
        "open-current-phase",
        "先按 legacy 安全边界确认",
        "当前项目缺少 operating mode / writeback tier 等新版元数据，而且不能安全判断为普通实现；先回到 full-governance 边界确认，避免把旧项目误降级。",
        ["planner", "hygiene"],
        "缺失的 mode / tier 信号已被确认，或本轮动作被拆成安全的下一步。",
        fullGovernanceMetadata(
          "旧项目缺字段时不会被静默降级；系统先确认边界，再决定能否轻量推进。"
        )
      ),
      alternatives: [
        recommendation(
          "run-hygiene",
          "先运行 hygiene",
          "如果缺失来自 stale packet 或旧 truth，hygiene 可以先重新锚定。",
          ["hygiene"],
          "legacy truth 与当前动作边界已经重新对齐。"
        ),
        recommendation(
          "create-handoff",
          "创建 legacy handoff",
          "如果要交给新线程判断，先打包当前旧项目状态。",
          ["hygiene"],
          "已经存在一个标明 legacy 风险的 continuation packet。"
        )
      ]
    };
  }

  if (pendingUserDecision && isBootstrapDecisionStage(state, latestRun, latestPhaseRun)) {
    return {
      primary: recommendation(
        "advance-phase",
        "补齐启动边界",
        `项目还没进入自动推进，当前先要补齐启动边界：${pendingUserDecision.taskSummary} 补完后再回到 autopilot 主线。`,
        ["planner"],
        state.currentPhase.stopCondition ||
          "项目已经具备第一条可执行 slice 的边界，可以进入真实推进。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "查看当前 phase 合同",
          "如果你想先重新确认这轮启动边界，先读一遍当前 phase 会更稳。",
          ["planner"],
          "当前 phase 的范围、停止条件和交付物重新对齐。"
        ),
        recommendation(
          "run-hygiene",
          "启动前先重新锚定",
          "如果这个项目是跨天恢复或刚初始化完成，先做一次 hygiene 会更稳。",
          ["hygiene"],
          "当前 truth、缺口与下一步启动动作已经重新拆开。"
        )
      ]
    };
  }

  if (pendingUserDecision) {
    return {
      primary: recommendation(
        "open-current-phase",
        "先做 gap check",
        `当前存在需要判断的开放决策：${pendingUserDecision.taskSummary}。先确认它是否改变范围、验收或产品语义，再决定能否进入 work session。`,
        [pendingUserDecision.role],
        "开放决策已被确认、排除或转成明确的实现路径。",
        {
          nextStepKind: "gap-check",
          ...fullGovernanceMetadata(
            "开放决策先被确认边界，避免把可能改变范围或产品语义的决定误当成普通实现。"
          )
        }
      ),
      alternatives: [
        recommendation(
          "run-hygiene",
          "决策前重新锚定 truth",
          "如果这个开放问题来自旧上下文或矛盾 packet，先运行 hygiene 会更稳。",
          ["hygiene"],
          "开放问题、committed truth 与下一步边界已经重新对齐。"
        ),
        recommendation(
          "create-handoff",
          "为当前判断创建 handoff",
          "如果需要切到另一个线程判断这个问题，先把当前边界打包。",
          ["hygiene"],
          "已经存在一个可继续的判断边界。"
        )
      ]
    };
  }

  const runningRole = state.activeWork.items.find(
    (item) => item.status === "running" && item.role !== "planner"
  );

  if (runningRole) {
    const roleLabel = formatRunningRole(runningRole.role);
    return {
      primary: recommendation(
        "open-current-phase",
        `${roleLabel}进行中`,
        `${roleLabel} 已经是当前活跃流程，因此最稳妥的下一步是检查 phase 边界，或等待这个角色产出结果。`,
        [runningRole.role],
        "当前角色完成，或 handoff 到下一阶段。"
      ),
      alternatives: [
        recommendation(
          "create-handoff",
          "创建 continuation handoff",
          "在线程变得更重之前，先把当前 truth 收起来。",
          ["hygiene"],
          "已经存在一个最新 continuation packet。"
        ),
        recommendation(
          "run-hygiene",
          "下一次 handoff 前先重新锚定",
          "如果当前流程暴露了过期假设或线程漂移，这样做会很有用。",
          ["hygiene"],
          "当前 truth 已重新清晰化。"
        )
      ]
    };
  }

  if (state.acceptanceState.verificationStatus === "failed") {
    return {
      primary: recommendation(
        "advance-phase",
        "修复 verification 缺口",
        "verification 已经失败了，因此现在最有价值的动作是做一个窄范围修复 slice。",
        ["planner", "executor", "reviewer"],
        "新的候选修改再次准备好进入 verification。"
      ),
      alternatives: [
        recommendation(
          "run-hygiene",
          "重新锚定当前线程",
          "如果这次失败暴露了过期假设或范围漂移，先做 hygiene 会更稳。",
          ["hygiene"],
          "已验证事实、假设和下一步窄动作已经重新分开。"
        ),
        recommendation(
          "create-handoff",
          "创建 continuation handoff",
          "如果当前线程太吵，或者你想留一个干净的恢复路径，这会很有用。",
          ["hygiene"],
          "已经存在一个最新 continuation packet。"
        )
      ]
    };
  }

  if (isAuditStopRequired(adaptiveSignals)) {
    return {
      primary: recommendation(
        "open-current-phase",
        "先确认 audit 边界",
        `${auditStopReason(adaptiveSignals)} 这类动作不能降级成轻量 work session，需要先确认 phase contract、验收和 stop condition。`,
        ["planner"],
        "audit 边界已经确认，或者该动作被拆成安全的后续 phase。",
        auditStopMetadata(
          adaptiveSignals,
          "高风险动作先回到审计边界，确保不会把公共行为、发布或状态风险混进普通实现。"
        )
      ),
      alternatives: [
        recommendation(
          "run-hygiene",
          "audit 前重新锚定 truth",
          "如果 audit stop 是由 stale truth 或 packet 冲突触发，先运行 hygiene。",
          ["hygiene"],
          "audit 触发原因与 committed truth 已重新一致。"
        ),
        recommendation(
          "create-handoff",
          "创建 audit handoff",
          "如果这一步要交给另一个线程或 agent，先保存清晰边界。",
          ["hygiene"],
          "已经存在一个带 audit 边界的 continuation packet。"
        )
      ]
    };
  }

  if (state.acceptanceState.reviewStatus === "review-blocked") {
    return {
      primary: recommendation(
        "advance-phase",
        "解决阻塞性评审发现",
        "review 已经暴露出真实阻塞，因此接下来的 phase 工作应该围绕它们收窄。",
        ["planner", "executor", "reviewer"],
        "阻塞性发现已被清除，工作重新准备好进入 verification。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "检查当前 phase 边界",
          "如果 review 表明范围已经漂移，就重新读一遍当前 phase。",
          ["planner"],
          "团队已经对正确的范围内修复达成一致。"
        ),
        recommendation(
          "run-hygiene",
          "修复前先运行 hygiene",
          "当 review 暴露出相互冲突的假设时，这会很有帮助。",
          ["hygiene"],
          "当前 truth 已重新锚定。"
        )
      ]
    };
  }

  if (
    state.acceptanceState.verificationStatus === "ready" ||
    state.acceptanceState.finalState === "ready-for-verification"
  ) {
    return {
      primary: recommendation(
        "run-verification",
        "运行 verification",
        "工作已经准备好进入证明阶段，现在该把实现转化成证据了。",
        ["verifier"],
        "acceptance 状态将带着证据变成通过或失败。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "查看当前 phase contract",
          "快速做一次范围检查，可以避免验证错 claim。",
          ["planner"],
          "phase contract 仍然与当前 claim 一致。"
        ),
        recommendation(
          "create-handoff",
          "创建可供审阅的 handoff",
          "如果 verification 更适合在干净一点的 continuation 中进行，这会很有用。",
          ["hygiene", "verifier"],
          "verification 可以从紧凑的 packet 继续。"
        )
      ]
    };
  }

  if (state.currentPhase.blockedBy.length > 0 || state.activeWork.blockerSummary) {
    return {
      primary: recommendation(
        "run-hygiene",
        "在阻塞 phase 上运行 hygiene",
        "项目已经有明确阻塞了，因此在继续执行消耗前先重新锚定。",
        ["hygiene", "planner"],
        "阻塞已被澄清，下一步也已经收窄。"
      ),
      alternatives: [
        recommendation(
          "open-current-phase",
          "打开当前 phase",
          "检查 phase 边界，确认这个阻塞到底在范围内还是范围外。",
          ["planner"],
          "phase 边界重新变得明确。"
        ),
        recommendation(
          "create-handoff",
          "为阻塞状态创建 handoff",
          "如果切到新的 continuation 会更稳妥，就先把当前阻塞状态保存下来。",
          ["hygiene"],
          "已经存在一个干净的阻塞态 continuation。"
        )
      ]
    };
  }

  if (shouldRecommendValueCheckpoint(adaptiveSignals)) {
    return {
      primary: recommendation(
        "open-current-phase",
        "做一次价值 checkpoint",
        "最近的推进已经连续偏向内部工程、治理或 gap check。现在适合轻量确认：继续工程深挖，还是切到用户可见价值、产品体验或验证质量。",
        ["planner"],
        "操作者已接受、跳过或完成这次 value checkpoint，下一步方向重新对齐。",
        {
          nextStepKind: "value-heartbeat",
          ...normalImplementationMetadata(
            "连续治理后先确认项目价值方向，避免一直做内部工程而忘记用户或操作者能感受到什么。",
            "operator",
            "operator_visible",
            "skip-daily",
            "governance",
            {
              diagnosticStreakCount: adaptiveSignals.diagnosticStreakCount,
              concreteNextStep: concreteNextStep(
                "project value-loop checkpoint",
                "decide whether to continue engineering depth or shift toward concrete project capability/value",
                "confirm the next accepted action has target, objective, verification, and stop gate",
                "stop if value sources conflict or the next action changes route, scope, public behavior, provider/defaults, release, or destructive behavior"
              )
            }
          )
        }
      ),
      alternatives: [
        recommendation(
          "advance-phase",
          "继续当前 work session",
          "如果操作者已经明确接受当前实现路径，heartbeat 不能打断已接受工作，可以继续推进。",
          ["planner", "executor", "reviewer"],
          "当前 work session 到达自然停点。",
          {
            nextStepKind: "work-session-continue",
            ...normalImplementationMetadata(
              "已接受的实现路径继续推进，不因为提醒机制而重新打断。",
              "internal",
              "internal",
              "skip-daily",
              "capability"
            )
          }
        ),
        recommendation(
          "create-handoff",
          "保存价值回看边界",
          "如果需要把价值判断交给另一个线程，先打包当前事实。",
          ["hygiene"],
          "已经存在一个用于价值回看的 continuation packet。"
        )
      ]
    };
  }

  const surfaceMetadata = resolveSurfaceMetadata(adaptiveSignals);
  const primaryWorkType = adaptiveSignals.workType ?? "capability";
  const diagnosticSupportCapability =
    adaptiveSignals.diagnosticSupportsCapability?.trim();
  const canBundle =
    adaptiveSignals.workBundleCandidate &&
    (adaptiveSignals.workBundleActionCount ?? 1) <= 4;
  const nextLabel = adaptiveSignals.lightRepair
    ? "执行轻量修复"
    : canBundle
    ? adaptiveSignals.rollingCloseoutAuthorized
      ? "继续 rolling work bundle"
      : "继续当前 work bundle"
    : canContinueWorkSession(state, pendingUserDecision)
    ? "继续当前 work session"
    : "推进当前 phase";
  const nextReason = adaptiveSignals.lightRepair
    ? adaptiveSignals.lightRepairReason?.trim() ||
      "这是一个不声明 durable phase acceptance 的窄修复；下一步应做 focused change 和 narrow verification。"
    : adaptiveSignals.previousGapCheckSelectedImplementationPath
    ? "上一轮 gap check 已经选出实现路径，且当前没有失败验证、范围变化或 audit stop；下一步应该进入实现，而不是再做一次 gap check。"
    : primaryWorkType === "diagnostic" && diagnosticSupportCapability
    ? `这轮诊断只作为开发者观察线索，目的是支撑“${diagnosticSupportCapability}”；不会把证据报告本身当成产品能力。`
    : canBundle
    ? "下一组动作仍在同一 work bundle 内，适合用 Progress Card 连续推进，而不是拆成新的 phase approval。"
    : "这是当前活跃项目里价值最高、且没有被阻塞的下一步。";

  return {
    primary: recommendation(
      "advance-phase",
      nextLabel,
      nextReason,
      ["planner", "executor", "reviewer"],
      "当前 slice 到达待评审或待验证状态。",
      adaptiveSignals.lightRepair
        ? lightRepairMetadata(
            "小修复只需要证明局部行为正确，不把它升级成完整阶段验收。"
          )
        : canBundle || canContinueWorkSession(state, pendingUserDecision)
        ? {
            nextStepKind: "work-session-continue",
            ...normalImplementationMetadata(
              "当前已接受的实现链可以继续推进到自然停点，而不是重新包装成新阶段。",
              surfaceMetadata.surfaceAudience,
              surfaceMetadata.workVisibility,
              "skip-daily",
              primaryWorkType,
              {
                diagnosticSupportCapability,
                diagnosticStreakCount: adaptiveSignals.diagnosticStreakCount,
                diagnosticBudgetOverrideReason:
                  adaptiveSignals.diagnosticBudgetOverrideReason,
                concreteNextStep: concreteNextStep(
                  primaryWorkType === "diagnostic"
                    ? "diagnostic evidence / fixture surface"
                    : "current accepted implementation surface",
                  primaryWorkType === "diagnostic" && diagnosticSupportCapability
                    ? `support the concrete capability: ${diagnosticSupportCapability}`
                    : "continue the accepted project capability toward a natural verification point",
                  primaryWorkType === "diagnostic"
                    ? "run focused fixture, mock, or evidence checks that prove the observation path"
                    : "run the relevant focused checks for the touched package or contract",
                  "stop for public/user-facing semantics, provider/default changes, destructive action, failed verification, stale truth, or release/merge work"
                )
              }
            )
          }
        : undefined
    ),
    alternatives: [
      recommendation(
        "open-current-phase",
        "检查当前 phase",
        "如果你想先确认当前 slice，再开始编码前打开 phase contract。",
        ["planner"],
        "当前边界已经清晰。"
      ),
      recommendation(
        "create-handoff",
        "准备 continuation packet",
        "在线程变得更重之前，先把干净的交接点准备好。",
        ["hygiene"],
        "已经存在一个最新 continuation packet。"
      )
    ]
  };
}
