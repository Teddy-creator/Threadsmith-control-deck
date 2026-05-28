import type {
  AcceptanceState,
  ActiveWork,
  ActiveWorkItem,
  PhaseOwner,
  ProjectState
} from "@threadsmith/domain";

const ROLE_ORDER: PhaseOwner[] = [
  "planner",
  "executor",
  "reviewer",
  "verifier",
  "closeout",
  "hygiene"
];

export const REVIEW_BLOCKED_GAP = "Reviewer 提出了阻塞性发现。";
export const VERIFICATION_FAILED_GAP = "当前 claim 未通过 verification。";

const LEGACY_REVIEW_BLOCKED_GAP = "Reviewer surfaced blocking findings.";
const LEGACY_VERIFICATION_FAILED_GAP = "Verification failed on the current claim.";

export function makeItem(
  role: PhaseOwner,
  status: ActiveWorkItem["status"],
  taskSummary: string,
  requiresUserDecision = false
): ActiveWorkItem {
  return {
    role,
    status,
    taskSummary,
    requiresUserDecision
  };
}

export function mergeActiveWork(
  state: ProjectState,
  overrides: Partial<Record<PhaseOwner, Omit<ActiveWorkItem, "role">>>,
  blockerSummary?: string | null
): ActiveWork {
  const items = new Map(
    state.activeWork.items.map((item) => [item.role, { ...item }] as const)
  );

  for (const role of ROLE_ORDER) {
    const override = overrides[role];
    if (!override) {
      continue;
    }

    items.set(role, {
      role,
      ...override
    });
  }

  return {
    items: ROLE_ORDER.filter((role) => items.has(role)).map(
      (role) => items.get(role)!
    ),
    blockerSummary:
      blockerSummary === undefined ? state.activeWork.blockerSummary : blockerSummary
  };
}

export function withoutWorkflowGaps(knownGaps: string[]) {
  return knownGaps.filter(
    (gap) =>
      gap !== REVIEW_BLOCKED_GAP &&
      gap !== VERIFICATION_FAILED_GAP &&
      gap !== LEGACY_REVIEW_BLOCKED_GAP &&
      gap !== LEGACY_VERIFICATION_FAILED_GAP
  );
}

export function addKnownGap(knownGaps: string[], gap: string) {
  return withoutWorkflowGaps(knownGaps).includes(gap)
    ? withoutWorkflowGaps(knownGaps)
    : [...withoutWorkflowGaps(knownGaps), gap];
}

export function markChecklistPassed(acceptanceState: AcceptanceState) {
  return acceptanceState.doneWhenChecklist.map((item) =>
    item.status === "pass" ? item : { ...item, status: "pass" as const }
  );
}

export function ensureRunningRole(state: ProjectState, role: PhaseOwner) {
  const item = state.activeWork.items.find((candidate) => candidate.role === role);
  if (!item || item.status !== "running") {
    throw new Error(`无法应用流转，因为 ${role} 不处于 running 状态`);
  }
}

export function nextExecutorTask(state: ProjectState) {
  if (state.acceptanceState.verificationStatus === "failed") {
    return "修复 verification 缺口，并准备下一轮 review";
  }

  if (state.acceptanceState.reviewStatus === "review-blocked") {
    return "处理当前 slice 中的阻塞性评审发现";
  }

  return "实现当前这刀 narrow slice";
}
