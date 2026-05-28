import type {
  AcceptanceState,
  ActiveWork,
  PhaseOwner,
  ProjectState,
  WorkflowTransitionId
} from "@threadsmith/domain";
import { writeCurrentAgentHandoff } from "./agentHandoff.ts";
import { writeContinuationPacket } from "./continuationPackets.ts";
import {
  appendEvent,
  readRecentEvents,
  resolveMonotonicEventTimestamp
} from "./events.ts";
import {
  loadProjectState,
  writeStateFragment
} from "./fileStore.ts";
import { STATE_FILES } from "./paths.ts";
import {
  writeCloseoutArtifact,
  writeVerificationEvidenceArtifact
} from "./workflowArtifacts.ts";
import { appendCloseoutPhaseHistory } from "./workflowPhaseHistory.ts";
import {
  addKnownGap,
  ensureRunningRole,
  makeItem,
  markChecklistPassed,
  mergeActiveWork,
  REVIEW_BLOCKED_GAP,
  VERIFICATION_FAILED_GAP,
  withoutWorkflowGaps
} from "./workflowState.ts";

function offsetIsoTimestamp(timestamp: string, offsetMs = 1) {
  return new Date(new Date(timestamp).getTime() + offsetMs).toISOString();
}

export async function applyWorkflowTransition(
  projectRoot: string,
  transitionId: WorkflowTransitionId
) {
  const state = await loadProjectState(projectRoot);
  const createdAt = await resolveMonotonicEventTimestamp(projectRoot);
  let nextAcceptance: AcceptanceState = state.acceptanceState;
  let nextActiveWork: ActiveWork = state.activeWork;
  let eventTitle = "";
  let eventDetail = "";
  let role: PhaseOwner;
  let artifactPath: string | undefined;
  let acceptedHandoffState: ProjectState | null = null;

  switch (transitionId) {
    case "executor-ready-for-review": {
      ensureRunningRole(state, "executor");
      role = "executor";
      nextAcceptance = {
        ...state.acceptanceState,
        implementationStatus: "ready-for-review",
        reviewStatus: "in-review",
        verificationStatus: "not-started",
        finalState: "ready-for-review",
        knownGaps: withoutWorkflowGaps(state.acceptanceState.knownGaps)
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          executor: makeItem(
            "executor",
            "done",
            "已把当前 slice 交给 review"
          ),
          reviewer: makeItem(
            "reviewer",
            "running",
            "根据 project brief 与当前 phase 审查这个 slice"
          ),
          verifier: makeItem(
            "verifier",
            "waiting",
            "等待 review 结果后再运行 verification"
          )
        },
        null
      );
      eventTitle = "Executor 已交接给 reviewer";
      eventDetail = "Acceptance 已进入 ready-for-review。";
      break;
    }
    case "reviewer-blocked": {
      ensureRunningRole(state, "reviewer");
      role = "reviewer";
      nextAcceptance = {
        ...state.acceptanceState,
        reviewStatus: "review-blocked",
        verificationStatus: "not-started",
        finalState: "review-blocked",
        knownGaps: addKnownGap(
          withoutWorkflowGaps(state.acceptanceState.knownGaps),
          REVIEW_BLOCKED_GAP
        )
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          reviewer: makeItem(
            "reviewer",
            "blocked",
            "在 review 能继续之前，需要先解决阻塞性发现",
            true
          ),
          executor: makeItem(
            "executor",
            "waiting",
            "等待修复阻塞性评审发现后的下一刀",
            true
          ),
          verifier: makeItem(
            "verifier",
            "idle",
            "在 review 阻塞解除前，verification 暂停"
          )
        },
        "阻塞性评审发现需要被解决"
      );
      eventTitle = "Reviewer 阻塞了这个 slice";
      eventDetail = "Acceptance 已进入 review-blocked。";
      break;
    }
    case "reviewer-ready-for-verification": {
      ensureRunningRole(state, "reviewer");
      role = "reviewer";
      nextAcceptance = {
        ...state.acceptanceState,
        reviewStatus: "ready-for-verification",
        verificationStatus: "ready",
        finalState: "ready-for-verification",
        knownGaps: withoutWorkflowGaps(state.acceptanceState.knownGaps)
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          reviewer: makeItem(
            "reviewer",
            "done",
            "已允许这个 slice 进入 verification"
          ),
          verifier: makeItem(
            "verifier",
            "waiting",
            "现在可以针对当前 claim 启动 verification"
          )
        },
        null
      );
      eventTitle = "Reviewer 已放行这个 slice";
      eventDetail = "Acceptance 已进入 ready-for-verification。";
      break;
    }
    case "verifier-failed": {
      ensureRunningRole(state, "verifier");
      role = "verifier";
      nextAcceptance = {
        ...state.acceptanceState,
        verificationStatus: "failed",
        closeoutStatus: "not-started",
        finalState: "verification-failed",
        knownGaps: addKnownGap(
          withoutWorkflowGaps(state.acceptanceState.knownGaps),
          VERIFICATION_FAILED_GAP
        )
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          verifier: makeItem(
            "verifier",
            "blocked",
            "当前 claim 未通过 verification",
            true
          ),
          executor: makeItem(
            "executor",
            "waiting",
            "等待 failed verification 之后的下一刀修复",
            true
          ),
          closeout: makeItem(
            "closeout",
            "idle",
            "在 verification 通过之前，closeout 无法开始"
          )
        },
        "当前 claim 未通过 verification"
      );
      const recentEvents = await readRecentEvents(projectRoot);
      const evidenceArtifact = await writeVerificationEvidenceArtifact(projectRoot, {
        state: {
          ...state,
          acceptanceState: nextAcceptance,
          activeWork: nextActiveWork
        },
        recentEvents,
        createdAt,
        status: "failed"
      });
      artifactPath = evidenceArtifact.relativePath;
      eventTitle = "Verifier 未通过当前 claim";
      eventDetail = `Acceptance 已进入 verification-failed。 Evidence：${evidenceArtifact.relativePath}`;
      break;
    }
    case "verifier-accepted": {
      ensureRunningRole(state, "verifier");
      role = "verifier";
      nextAcceptance = {
        ...state.acceptanceState,
        verificationStatus: "passed",
        closeoutStatus: "pending",
        finalState: "accepted-with-closeout-pending",
        knownGaps: [],
        doneWhenChecklist: markChecklistPassed(state.acceptanceState)
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          verifier: makeItem(
            "verifier",
            "done",
            "verification 证据支持当前 claim"
          ),
          closeout: makeItem(
            "closeout",
            "running",
            "清理残留工作并完成最终收口"
          )
        },
        null
      );
      const recentEvents = await readRecentEvents(projectRoot);
      const evidenceArtifact = await writeVerificationEvidenceArtifact(projectRoot, {
        state: {
          ...state,
          acceptanceState: nextAcceptance,
          activeWork: nextActiveWork
        },
        recentEvents,
        createdAt,
        status: "passed"
      });
      artifactPath = evidenceArtifact.relativePath;
      eventTitle = "Verifier 已接受当前 claim";
      eventDetail = `最终接受前还需要完成 closeout。 Evidence：${evidenceArtifact.relativePath}`;
      break;
    }
    case "closeout-complete": {
      ensureRunningRole(state, "closeout");
      role = "closeout";
      nextAcceptance = {
        ...state.acceptanceState,
        closeoutStatus: "done",
        finalState: "accepted",
        knownGaps: []
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          closeout: makeItem(
            "closeout",
            "done",
            "closeout 已完成，这个 slice 已被接受"
          ),
          hygiene: makeItem(
            "hygiene",
            "done",
            "accepted handoff 已自动写回，可作为下一段 slice 的 continuation packet"
          )
        },
        null
      );
      acceptedHandoffState = {
        ...state,
        acceptanceState: nextAcceptance,
        activeWork: nextActiveWork
      };
      const recentEvents = await readRecentEvents(projectRoot);
      const closeoutArtifact = await writeCloseoutArtifact(projectRoot, {
        state: acceptedHandoffState,
        recentEvents,
        createdAt
      });
      await appendCloseoutPhaseHistory({
        projectRoot,
        state: acceptedHandoffState,
        closeoutArtifactPath: closeoutArtifact.relativePath,
        createdAt
      });
      artifactPath = closeoutArtifact.relativePath;
      eventTitle = "Closeout 已完成";
      eventDetail = `Acceptance 已进入 accepted。 Closeout：${closeoutArtifact.relativePath}`;
      break;
    }
  }

  await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, nextAcceptance);
  await writeStateFragment(projectRoot, STATE_FILES.activeWork, nextActiveWork);
  await appendEvent(projectRoot, {
    id: crypto.randomUUID(),
    createdAt,
    kind: "workflow-transition",
    title: eventTitle,
    detail: eventDetail,
    role,
    transitionId,
    artifactPath
  });

  if (acceptedHandoffState) {
    const packetCreatedAt = offsetIsoTimestamp(createdAt);
    const recentEvents = await readRecentEvents(projectRoot);
    const packet = await writeContinuationPacket(projectRoot, {
      kind: "handoff",
      state: acceptedHandoffState,
      recentEvents,
      createdAt: packetCreatedAt,
      continuationBehavior:
        acceptedHandoffState.preferences.resolved.continuationBehavior
    });
    const currentHandoff = await writeCurrentAgentHandoff(projectRoot, {
      state: acceptedHandoffState,
      recentEvents,
      createdAt: packetCreatedAt
    });

    await appendEvent(projectRoot, {
      id: crypto.randomUUID(),
      createdAt: packetCreatedAt,
      kind: "workflow-transition",
      title: packet.title,
      detail: `${packet.detail} Packet：${packet.relativePath} Current handoff：${currentHandoff.relativePath}（closeout 自动生成）`,
      role: "hygiene",
      actionId: "create-handoff",
      artifactPath: currentHandoff.relativePath
    });
  }
}
