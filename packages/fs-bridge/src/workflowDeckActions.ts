import type {
  AcceptanceState,
  ContinuationBehavior
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
import type { DeckAction } from "./schema.ts";
import { syncCurrentContextPacket } from "./workflowContextSync.ts";
import { writeVerificationEvidenceArtifact } from "./workflowArtifacts.ts";
import {
  makeItem,
  mergeActiveWork,
  nextExecutorTask,
  withoutWorkflowGaps
} from "./workflowState.ts";

export async function applyDeckActionState(
  projectRoot: string,
  actionId: DeckAction["actionId"],
  options?: {
    continuationBehavior?: ContinuationBehavior;
  }
) {
  const state = await loadProjectState(projectRoot);

  if (actionId === "advance-phase") {
    const nextAcceptance: AcceptanceState = {
      ...state.acceptanceState,
      implementationStatus: "implementing",
      reviewStatus: "not-started",
      verificationStatus: "not-started",
      closeoutStatus: "not-started",
      finalState: "not-ready",
      knownGaps: withoutWorkflowGaps(state.acceptanceState.knownGaps)
    };
    const nextActiveWork = mergeActiveWork(
      state,
      {
        executor: makeItem(
          "executor",
          "running",
          nextExecutorTask(state)
        ),
        reviewer: makeItem(
          "reviewer",
          "waiting",
          "等待 executor 完成交接后开始 review"
        ),
        verifier: makeItem(
          "verifier",
          "idle",
          "等待 review 通过后开始 verification"
        ),
        closeout: makeItem(
          "closeout",
          "idle",
          "等待 verification 通过后再进入 closeout"
        )
      },
      null
    );

    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, nextAcceptance);
    await writeStateFragment(projectRoot, STATE_FILES.activeWork, nextActiveWork);
    await appendEvent(projectRoot, {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      kind: "deck-action",
      title: "执行流程已启动",
      detail: nextExecutorTask(state),
      role: "executor",
      actionId
    });
    return;
  }

  if (actionId === "run-verification") {
    const createdAt = await resolveMonotonicEventTimestamp(projectRoot);
    const nextAcceptance: AcceptanceState = {
      ...state.acceptanceState,
      verificationStatus: "running"
    };
    const nextActiveWork = mergeActiveWork(
      state,
      {
        reviewer: makeItem(
          "reviewer",
          "done",
          "已完成 review 交接"
        ),
        verifier: makeItem(
          "verifier",
          "running",
          "对当前 claim 执行 verification"
        ),
        closeout: makeItem(
          "closeout",
          "waiting",
          "等待 verification 结果后再做 closeout"
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
      status: "running"
    });

    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, nextAcceptance);
    await writeStateFragment(projectRoot, STATE_FILES.activeWork, nextActiveWork);
    await appendEvent(projectRoot, {
      id: crypto.randomUUID(),
      createdAt,
      kind: "deck-action",
      title: "Verification 已开始",
      detail: `verifier 正在根据最新证据检查当前 claim。 Evidence：${evidenceArtifact.relativePath}`,
      role: "verifier",
      actionId,
      artifactPath: evidenceArtifact.relativePath
    });
    return;
  }

  if (actionId === "sync-context") {
    const createdAt = await resolveMonotonicEventTimestamp(projectRoot);
    const { packetId, packetPath } = await syncCurrentContextPacket({
      projectRoot,
      state,
      createdAt
    });

    await appendEvent(projectRoot, {
      id: crypto.randomUUID(),
      createdAt,
      kind: "deck-action",
      title: "Context Packet 已刷新",
      detail: `已从 committed Threadsmith truth 重新生成 current-packet.json（${packetId}）。 Packet：${packetPath}`,
      role: "hygiene",
      actionId,
      artifactPath: packetPath
    });

    return;
  }

  if (actionId === "run-hygiene" || actionId === "create-handoff") {
    const createdAt = await resolveMonotonicEventTimestamp(projectRoot);
    const recentEvents = await readRecentEvents(projectRoot);
    const packet = await writeContinuationPacket(projectRoot, {
      kind: actionId === "create-handoff" ? "handoff" : "hygiene",
      state,
      recentEvents,
      createdAt,
      continuationBehavior: options?.continuationBehavior
    });
    const currentHandoff =
      actionId === "create-handoff"
        ? await writeCurrentAgentHandoff(projectRoot, {
            state,
            recentEvents,
            createdAt
          })
        : null;
    const nextActiveWork = mergeActiveWork(
      state,
      {
        hygiene: makeItem(
          "hygiene",
          "done",
          actionId === "create-handoff"
            ? "已为下一段 slice 创建 continuation packet"
            : "已把当前 Threadsmith truth 收进 hygiene packet"
        )
      }
    );

    await writeStateFragment(projectRoot, STATE_FILES.activeWork, nextActiveWork);
    await appendEvent(projectRoot, {
      id: crypto.randomUUID(),
      createdAt,
      kind: "deck-action",
      title: packet.title,
      detail: `${packet.detail} Packet：${packet.relativePath}${
        currentHandoff ? ` Current handoff：${currentHandoff.relativePath}` : ""
      }`,
      role: "hygiene",
      actionId,
      artifactPath: currentHandoff?.relativePath ?? packet.relativePath
    });
    return;
  }

  await appendEvent(projectRoot, {
    id: crypto.randomUUID(),
    createdAt: await resolveMonotonicEventTimestamp(projectRoot),
    kind: "deck-action",
    title:
      actionId === "run-hygiene" ? "已请求 hygiene" : "已请求 handoff",
    detail:
      actionId === "run-hygiene"
        ? "在继续累积工作之前，先重新锚定 session。"
        : "根据当前 Threadsmith truth 生成一份干净的 continuation packet。",
    role: "hygiene",
    actionId
  });
}
