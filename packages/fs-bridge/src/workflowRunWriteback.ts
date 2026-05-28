import type {
  AcceptanceState,
  ActiveWork
} from "@threadsmith/domain";
import {
  readAgentRunPacket,
  readAgentRunRecord,
  readAgentRunResult
} from "./agentRuns.ts";
import { recordCommandBridgeRunFinished } from "./commandBridge.ts";
import {
  appendEvent,
  resolveMonotonicEventTimestamp
} from "./events.ts";
import {
  loadProjectState,
  writeStateFragment
} from "./fileStore.ts";
import { STATE_FILES } from "./paths.ts";
import {
  automationFailureGap,
  executorFailureTaskSummary,
  failedRunEventDetail,
  failedRunEventTitle,
  isArtifactOnlyRun,
  providerLabel,
  runArtifactPath
} from "./workflowRunResultFormat.ts";
import {
  addKnownGap,
  makeItem,
  mergeActiveWork,
  nextExecutorTask,
  withoutWorkflowGaps
} from "./workflowState.ts";
import { applyWorkflowTransition } from "./workflowTransitionsApply.ts";

export async function applyAgentRunResult(projectRoot: string, runId: string) {
  const state = await loadProjectState(projectRoot);
  const packet = await readAgentRunPacket(projectRoot, runId);
  const result = await readAgentRunResult(projectRoot, runId);
  const record = await readAgentRunRecord(projectRoot, runId);
  const createdAt = record.finishedAt ?? new Date().toISOString();
  const artifactPath = runArtifactPath(record.summaryPath, record.resultPath);
  const artifactOnly = isArtifactOnlyRun(packet);

  await recordCommandBridgeRunFinished(projectRoot, runId);

  let nextAcceptance: AcceptanceState = state.acceptanceState;
  let nextActiveWork: ActiveWork = state.activeWork;
  let writeDirectState = false;
  let handledByTransition = false;

  if (!artifactOnly && result.role === "planner") {
    if (result.outcome === "succeeded" && result.decision === "slice-ready") {
      nextAcceptance = {
        ...state.acceptanceState,
        implementationStatus: "implementing",
        reviewStatus: "not-started",
        verificationStatus: "not-started",
        closeoutStatus: "not-started",
        finalState: "not-ready",
        knownGaps: withoutWorkflowGaps(state.acceptanceState.knownGaps)
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          planner: makeItem(
            "planner",
            "done",
            "已为当前 locked phase 选出下一条 slice"
          ),
          executor: makeItem(
            "executor",
            "running",
            nextExecutorTask(state)
          ),
          reviewer: makeItem(
            "reviewer",
            "waiting",
            "等待 executor 完成当前 slice 后开始 review"
          ),
          verifier: makeItem(
            "verifier",
            "idle",
            "等待 review 放行后再开始 verification"
          ),
          closeout: makeItem(
            "closeout",
            "idle",
            "等待 verification 通过后再进入 closeout"
          )
        },
        null
      );
      writeDirectState = true;
    } else {
      const failureGap = automationFailureGap(result);
      nextActiveWork = mergeActiveWork(
        state,
        {
          planner: makeItem(
            "planner",
            "blocked",
            result.decision === "pause-recommended"
              ? "Planner 建议暂停，等待补齐条件后再继续"
              : "Planner 没有给出可继续的 slice"
          ),
          executor: makeItem(
            "executor",
            "waiting",
            "等待 planner 重新收束下一条 slice",
            true
          )
        },
        failureGap
      );
      writeDirectState = true;
    }
  }

  if (!artifactOnly && result.role === "executor") {
    if (result.outcome === "succeeded") {
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
            "自动执行已完成，等待 reviewer 接手"
          ),
          reviewer: makeItem(
            "reviewer",
            "running",
            "根据最新结果审查当前 slice"
          ),
          verifier: makeItem(
            "verifier",
            "waiting",
            "等待 review 放行后再运行 verification"
          ),
          closeout: makeItem(
            "closeout",
            "idle",
            "等待 verification 通过后再进入 closeout"
          )
        },
        null
      );
    } else {
      const failureGap = automationFailureGap(result);
      nextAcceptance = {
        ...state.acceptanceState,
        implementationStatus: "implementing",
        reviewStatus: "not-started",
        verificationStatus: "not-started",
        closeoutStatus: "not-started",
        finalState: "not-ready",
        knownGaps: addKnownGap(
          withoutWorkflowGaps(state.acceptanceState.knownGaps),
          failureGap
        )
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          executor: makeItem(
            "executor",
            "blocked",
            executorFailureTaskSummary(result)
          ),
          reviewer: makeItem(
            "reviewer",
            "waiting",
            "等待新的 executor 结果后再开始 review"
          ),
          verifier: makeItem(
            "verifier",
            "idle",
            "当前还不能进入 verification"
          ),
          closeout: makeItem(
            "closeout",
            "idle",
            "在实现重新稳定前，closeout 暂不开始"
          )
        },
        failureGap
      );
    }

    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, nextAcceptance);
    await writeStateFragment(projectRoot, STATE_FILES.activeWork, nextActiveWork);
  }

  if (!artifactOnly && result.role === "reviewer") {
    if (result.outcome === "succeeded" && result.decision === "review-blocked") {
      await applyWorkflowTransition(projectRoot, "reviewer-blocked");
      handledByTransition = true;
    } else if (
      result.outcome === "succeeded" &&
      result.decision === "ready-for-verification"
    ) {
      nextAcceptance = {
        ...state.acceptanceState,
        reviewStatus: "ready-for-verification",
        verificationStatus: "running",
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
            "running",
            "正在对当前 claim 执行 verification"
          ),
          closeout: makeItem(
            "closeout",
            "idle",
            "等待 verification 通过后再进入 closeout"
          )
        },
        null
      );
      writeDirectState = true;
    } else {
      const failureGap = automationFailureGap(result);
      nextAcceptance = {
        ...state.acceptanceState,
        reviewStatus: "review-blocked",
        verificationStatus: "not-started",
        finalState: "review-blocked",
        knownGaps: addKnownGap(
          withoutWorkflowGaps(state.acceptanceState.knownGaps),
          failureGap
        )
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          reviewer: makeItem(
            "reviewer",
            "blocked",
            "Reviewer 没有给出可放行的结论",
            true
          ),
          executor: makeItem(
            "executor",
            "waiting",
            "等待下一条 repair slice 再继续",
            true
          )
        },
        failureGap
      );
      writeDirectState = true;
    }
  }

  if (!artifactOnly && result.role === "verifier") {
    if (result.outcome === "succeeded" && result.decision === "verification-failed") {
      await applyWorkflowTransition(projectRoot, "verifier-failed");
      handledByTransition = true;
    } else if (
      result.outcome === "succeeded" &&
      result.decision === "accepted-with-closeout-pending"
    ) {
      await applyWorkflowTransition(projectRoot, "verifier-accepted");
      handledByTransition = true;
    } else {
      const failureGap = automationFailureGap(result);
      nextAcceptance = {
        ...state.acceptanceState,
        verificationStatus: "failed",
        closeoutStatus: "not-started",
        finalState: "verification-failed",
        knownGaps: addKnownGap(
          withoutWorkflowGaps(state.acceptanceState.knownGaps),
          failureGap
        )
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          verifier: makeItem(
            "verifier",
            "blocked",
            "Verifier 没有给出可继续的结果",
            true
          ),
          executor: makeItem(
            "executor",
            "waiting",
            "等待新的 repair slice 再继续",
            true
          )
        },
        failureGap
      );
      writeDirectState = true;
    }
  }

  if (!artifactOnly && result.role === "closeout") {
    if (
      result.outcome === "succeeded" &&
      (result.decision === "accepted" || result.decision === undefined)
    ) {
      await applyWorkflowTransition(projectRoot, "closeout-complete");
      handledByTransition = true;
    } else {
      const failureGap = automationFailureGap(result);
      nextAcceptance = {
        ...state.acceptanceState,
        closeoutStatus: "pending",
        finalState: "accepted-with-closeout-pending",
        knownGaps: addKnownGap(
          withoutWorkflowGaps(state.acceptanceState.knownGaps),
          failureGap
        )
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          closeout: makeItem(
            "closeout",
            "blocked",
            "Closeout 还没有完成，等待处理残留项",
            true
          )
        },
        failureGap
      );
      writeDirectState = true;
    }
  }

  if (writeDirectState && !handledByTransition && result.role !== "executor") {
    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, nextAcceptance);
    await writeStateFragment(projectRoot, STATE_FILES.activeWork, nextActiveWork);
  }

  await appendEvent(projectRoot, {
    id: crypto.randomUUID(),
    createdAt,
    kind: "agent-run",
    title:
      result.outcome === "succeeded"
        ? `${providerLabel(result.provider)} 完成 ${result.role} 执行`
        : failedRunEventTitle(result),
    detail:
      result.outcome === "succeeded"
        ? `结果：${result.summary}${artifactPath ? ` Artifact：${artifactPath}` : ""}`
        : failedRunEventDetail(result, artifactPath),
    role: result.role,
    runId,
    provider: result.provider,
    outcome: result.outcome,
    artifactPath
  });
}
