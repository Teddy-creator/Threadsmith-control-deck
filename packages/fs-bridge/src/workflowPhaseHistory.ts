import type { PhaseHistoryEntry, ProjectState } from "@threadsmith/domain";
import {
  appendPhaseHistoryEntry,
  readPhaseHistory
} from "./phaseHistory.ts";

function slugPhaseHistoryId(phaseName: string, createdAt: string) {
  const slug = phaseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const timestamp = createdAt.replace(/[^0-9]/g, "").slice(0, 14);

  return `phase-history-${timestamp}-${slug || "phase"}`;
}

function summarizePhaseHistoryResult(state: ProjectState) {
  const passedCount = state.acceptanceState.doneWhenChecklist.filter(
    (item) => item.status === "pass"
  ).length;

  return `${state.currentPhase.phaseName} accepted：${state.acceptanceState.currentClaim} Done When ${passedCount}/${state.acceptanceState.doneWhenChecklist.length} passed.`;
}

function buildPhaseHistoryEntry(args: {
  state: ProjectState;
  closeoutArtifactPath: string;
  createdAt: string;
}): PhaseHistoryEntry {
  return {
    id: slugPhaseHistoryId(args.state.currentPhase.phaseName, args.createdAt),
    phaseName: args.state.currentPhase.phaseName,
    result: "accepted",
    summary: summarizePhaseHistoryResult(args.state),
    startedAt: null,
    completedAt: args.createdAt,
    deliverables: [
      args.state.currentPhase.deliverable,
      args.closeoutArtifactPath
    ],
    verification: args.state.currentPhase.verificationForThisPhase,
    evidenceRefs: [args.closeoutArtifactPath],
    nextPhase: args.state.projectStatus.nextPlannedSlice?.title ?? null,
    risks: args.state.acceptanceState.knownGaps,
    source: {
      kind: "closeout",
      ref: args.closeoutArtifactPath
    },
    createdAt: args.createdAt
  };
}

export async function appendCloseoutPhaseHistory(args: {
  projectRoot: string;
  state: ProjectState;
  closeoutArtifactPath: string;
  createdAt: string;
}) {
  const history = await readPhaseHistory(args.projectRoot);
  const alreadyRecorded = history.some(
    (entry) =>
      entry.phaseName === args.state.currentPhase.phaseName &&
      entry.source.kind === "closeout" &&
      entry.source.ref === args.closeoutArtifactPath
  );

  if (alreadyRecorded) {
    return null;
  }

  return appendPhaseHistoryEntry(
    args.projectRoot,
    buildPhaseHistoryEntry({
      state: args.state,
      closeoutArtifactPath: args.closeoutArtifactPath,
      createdAt: args.createdAt
    })
  );
}
