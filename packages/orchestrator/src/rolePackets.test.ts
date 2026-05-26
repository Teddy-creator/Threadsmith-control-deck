import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  STATE_FILES,
  createAgentRun,
  createPhaseRun,
  initializeProjectState,
  readPhaseRunEvidenceBundle,
  writeAgentRunResult,
  writeLockedPhaseSnapshot,
  writePhasePause,
  writePhaseSlice,
  writeStateFragment
} from "@threadsmith/fs-bridge";
import {
  buildCloseoutPacket,
  buildExecutorPacket,
  buildPlannerPacket,
  buildReviewerPacket,
  buildVerifierPacket,
  renderRolePrompt
} from "./rolePackets.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-role-packets-"));
  createdRoots.push(projectRoot);
  await initializeProjectState(projectRoot);
  return projectRoot;
}

async function seedLatestExecutorRun(projectRoot: string) {
  await createAgentRun(
    projectRoot,
    {
      runId: "run-prev",
      projectRoot,
      role: "executor",
      provider: "codex",
      objective: "实现当前 slice",
      scope: ["packages/orchestrator/src/runEngine.ts"],
      doneWhen: ["当前 slice 可以进入 review"],
      verification: ["npm run test"],
      contextRefs: [],
      output: {
        resultPath: ".threadsmith/runs/run-prev/result.json",
        summaryPath: ".threadsmith/runs/run-prev/result.md"
      }
    },
    "2026-04-12T09:00:00.000Z"
  );

  await writeAgentRunResult(
    projectRoot,
    "run-prev",
    {
      runId: "run-prev",
      role: "executor",
      provider: "codex",
      outcome: "succeeded",
      decision: "ready-for-review",
      summary: "当前 slice 已经完成，准备进入 review。",
      changedFiles: ["packages/orchestrator/src/runEngine.ts"],
      verification: [{ command: "npm run test", status: "passed" }],
      evidenceRefs: [".threadsmith/runs/run-prev/result.md"]
    },
    "2026-04-12T09:03:00.000Z"
  );
}

async function seedLatestPhaseRun(projectRoot: string) {
  await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
    currentClaim: "当前需要一轮 repair。",
    doneWhenChecklist: [
      {
        id: "repair-done",
        label: "repair slice 已被重新验证",
        status: "unknown"
      }
    ],
    implementationStatus: "implementing",
    reviewStatus: "review-blocked",
    verificationStatus: "not-started",
    closeoutStatus: "not-started",
    knownGaps: ["Reviewer 提出了阻塞性发现。"],
    finalState: "review-blocked"
  });

  await createPhaseRun(projectRoot, {
    phaseRunId: "phase-run-1",
    projectRoot,
    status: "paused",
    currentRole: "planner",
    currentSliceId: "repair-1",
    repairCount: 1,
    lockedPhaseSnapshotRef: ".threadsmith/phase-runs/phase-run-1/locked-phase.json",
    latestSuccessfulRole: "executor",
    pauseReason: "等待 planner 收束 repair slice。",
    resumeHint: "npm run threadsmith:autopilot -- continue /tmp/project",
    workspacePath: "/tmp/project/.threadsmith-runtime/phase-run-1",
    latestRunRef: ".threadsmith/runs/run-prev/result.md",
    eventRefs: [],
    startedAt: "2026-04-12T09:10:00.000Z",
    finishedAt: null
  });

  await writeLockedPhaseSnapshot(projectRoot, "phase-run-1", {
    phaseRunId: "phase-run-1",
    capturedAt: "2026-04-12T09:10:00.000Z",
    phase: {
      phaseName: "repair phase",
      phaseGoal: "修复阻塞性评审问题",
      deliverable: "repair slice",
      inScope: ["修复 review blocker"],
      outOfScope: ["重做整个系统"],
      stopCondition: "repair 通过 review 并重新进入 verification。",
      verificationForThisPhase: ["npm run test"],
      activeOwners: ["planner", "executor", "reviewer"],
      blockedBy: []
    }
  });

  await writePhaseSlice(projectRoot, "phase-run-1", {
    phaseRunId: "phase-run-1",
    sliceId: "repair-1",
    kind: "repair",
    goal: "修复 review blocker",
    scope: ["只修阻塞问题"],
    doneWhen: ["repair 可以重新进入 review"],
    verification: ["npm run test"],
    whyNow: "reviewer 阻塞了上一轮输出",
    createdByRunId: "run-planner",
    createdAt: "2026-04-12T09:11:00.000Z"
  });

  await writePhasePause(projectRoot, "phase-run-1", {
    phaseRunId: "phase-run-1",
    role: "planner",
    type: "blocked",
    summary: "需要先重新收束 repair slice。",
    detail: "reviewer 阻塞后，当前需要 planner 基于阻塞发现重写下一条 repair slice。",
    resumeRequirements: ["整理 blocker", "缩小 repair 范围"],
    recommendedPrompt: "npm run threadsmith:autopilot -- continue /tmp/project",
    createdAt: "2026-04-12T09:12:00.000Z"
  });
}

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((projectRoot) =>
      rm(projectRoot, { recursive: true, force: true })
    )
  );
});

describe("rolePackets", () => {
  it("builds a planner packet that stays inside the current phase contract", async () => {
    const projectRoot = await createProjectRoot();

    const packet = await buildPlannerPacket(projectRoot, "planner-run");
    const prompt = renderRolePrompt(packet);

    expect(packet.role).toBe("planner");
    expect(packet.objective).toContain("Planner mode: planning-phase");
    expect(packet.contextRefs).toEqual(
      expect.arrayContaining([
        {
          kind: "state",
          path: ".threadsmith/context/current-packet.json",
          title: "current context packet"
        },
        {
          kind: "state",
          path: ".threadsmith/context/role-packets/planner.json",
          title: "planner role context packet"
        }
      ])
    );
    expect(packet.contextRefs.some((ref) => ref.path === ".threadsmith/project-roadmap.json")).toBe(
      true
    );
    expect(packet.contextRefs.some((ref) => ref.path === ".threadsmith/project-brief.json")).toBe(
      true
    );
    expect(packet.contextRefs.some((ref) => ref.path === ".threadsmith/project-status.json")).toBe(
      true
    );
    expect(packet.doneWhen).toContain(
      "如果当前真相不足以安全继续，则改为给出 pause recommendation"
    );
    expect(prompt).toContain("Allowed decision values:");
    expect(prompt).toContain("slice-ready");
    expect(prompt).toContain("pause-recommended");
    expect(prompt).toContain("不要改写 locked phase contract");
    expect(packet.protocolInstruction?.protocol.id).toBe("plan");
    expect(prompt).toContain("Mini Protocol Instruction:");
    expect(prompt).toContain("Stop condition:");
    expect(prompt).toContain("Required inputs:");
  });

  it("keeps executor packets compatible while using the role-aware prompt", async () => {
    const projectRoot = await createProjectRoot();

    const packet = await buildExecutorPacket(projectRoot, "executor-run");
    const prompt = renderRolePrompt(packet);

    expect(packet.role).toBe("executor");
    expect(packet.contextRefs).toEqual(
      expect.arrayContaining([
        {
          kind: "state",
          path: ".threadsmith/context/current-packet.json",
          title: "current context packet"
        },
        {
          kind: "state",
          path: ".threadsmith/context/role-packets/executor.json",
          title: "executor role context packet"
        }
      ])
    );
    expect(
      packet.contextRefs.some(
        (ref) => ref.path === ".threadsmith/context/role-packets/reviewer.json"
      )
    ).toBe(false);
    expect(packet.contextRefs.some((ref) => ref.path === ".threadsmith/project-brief.json")).toBe(
      false
    );
    expect(packet.contextRefs.some((ref) => ref.path === ".threadsmith/project-roadmap.json")).toBe(
      false
    );
    expect(packet.verification.length).toBeGreaterThan(0);
    expect(packet.output.resultPath).toBe(
      ".threadsmith/runs/executor-run/result.json"
    );
    expect(prompt).toContain("ready-for-review");
    expect(prompt).toContain("如果不适用请显式填 `null`");
    expect(packet.protocolInstruction?.protocol.id).toBe("plan");
    expect(prompt).toContain("Protocol guardrails:");
  });

  it("does not slim acceptance criteria out of executor packets", async () => {
    const projectRoot = await createProjectRoot();
    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
      currentClaim: "当前 slice 要实现 packet slimming regression fixtures。",
      doneWhenChecklist: [
        {
          id: "executor-criteria",
          label: "executor packet 保留当前 slice 的验收标准",
          status: "unknown"
        },
        {
          id: "verification-criteria",
          label: "相关 packet 测试通过",
          status: "unknown"
        }
      ],
      implementationStatus: "implementing",
      reviewStatus: "not-started",
      verificationStatus: "not-started",
      closeoutStatus: "not-started",
      knownGaps: [],
      finalState: "not-ready"
    });

    const packet = await buildExecutorPacket(projectRoot, "executor-run");

    expect(packet.doneWhen).toEqual(
      expect.arrayContaining([
        "executor packet 保留当前 slice 的验收标准",
        "相关 packet 测试通过"
      ])
    );
    expect(packet.contextRefs).toEqual(
      expect.arrayContaining([
        {
          kind: "state",
          path: ".threadsmith/current-phase.json",
          title: "当前 phase"
        },
        {
          kind: "state",
          path: ".threadsmith/acceptance-state.json",
          title: "验收状态"
        }
      ])
    );
  });

  it("attaches latest phase-run continuity artifacts when a paused repair exists", async () => {
    const projectRoot = await createProjectRoot();
    await seedLatestPhaseRun(projectRoot);

    const plannerPacket = await buildPlannerPacket(projectRoot, "planner-run");
    const executorPacket = await buildExecutorPacket(projectRoot, "executor-run");
    const evidenceBundle = await readPhaseRunEvidenceBundle(projectRoot, "phase-run-1");

    expect(plannerPacket.objective).toContain("repair slice");
    expect(
      plannerPacket.contextRefs.some(
        (ref) => ref.path === ".threadsmith/phase-runs/phase-run-1/phase-run.json"
      )
    ).toBe(true);
    expect(
      plannerPacket.contextRefs.some(
        (ref) => ref.path === ".threadsmith/phase-runs/phase-run-1/locked-phase.json"
      )
    ).toBe(true);
    expect(
      plannerPacket.contextRefs.some(
        (ref) => ref.path === ".threadsmith/phase-runs/phase-run-1/slices/repair-1.json"
      )
    ).toBe(true);
    expect(
      plannerPacket.contextRefs.some(
        (ref) => ref.path === ".threadsmith/phase-runs/phase-run-1/pause.json"
      )
    ).toBe(true);
    expect(
      plannerPacket.contextRefs.some(
        (ref) => ref.path === ".threadsmith/phase-runs/phase-run-1/evidence-bundle.json"
      )
    ).toBe(true);
    expect(evidenceBundle?.phaseRun.currentSliceId).toBe("repair-1");
    expect(evidenceBundle?.acceptance.finalState).toBe("review-blocked");
    expect(evidenceBundle?.verification.recommendedLevel).toBe("standard");
    expect(
      executorPacket.contextRefs.some(
        (ref) => ref.path === ".threadsmith/phase-runs/phase-run-1/slices/repair-1.json"
      )
    ).toBe(true);
  });

  it("keeps blocker and failed-gate evidence in planner-reset packets", async () => {
    const projectRoot = await createProjectRoot();
    await seedLatestPhaseRun(projectRoot);

    const packet = await buildPlannerPacket(projectRoot, "planner-run");
    const evidenceBundle = await readPhaseRunEvidenceBundle(projectRoot, "phase-run-1");

    expect(packet.objective).toContain("Planner mode: planner-reset");
    expect(packet.objective).toContain("失败或阻塞信号");
    expect(packet.contextRefs).toEqual(
      expect.arrayContaining([
        {
          kind: "artifact",
          path: ".threadsmith/phase-runs/phase-run-1/pause.json",
          title: "pause / blocked"
        },
        {
          kind: "artifact",
          path: ".threadsmith/phase-runs/phase-run-1/evidence-bundle.json",
          title: "phase evidence bundle / standard"
        }
      ])
    );
    expect(evidenceBundle?.acceptance.finalState).toBe("review-blocked");
    expect(evidenceBundle?.acceptance.knownGaps).toContain(
      "Reviewer 提出了阻塞性发现。"
    );
    expect(evidenceBundle?.verification.escalationSignals).toContain(
      "failed-or-blocked-acceptance"
    );
  });

  it("builds reviewer, verifier, and closeout packets with explicit gate decisions", async () => {
    const projectRoot = await createProjectRoot();
    await seedLatestExecutorRun(projectRoot);

    const reviewerPacket = await buildReviewerPacket(projectRoot, "reviewer-run");
    const verifierPacket = await buildVerifierPacket(projectRoot, "verifier-run");
    const closeoutPacket = await buildCloseoutPacket(projectRoot, "closeout-run");
    const reviewerPrompt = renderRolePrompt(reviewerPacket);
    const verifierPrompt = renderRolePrompt(verifierPacket);
    const closeoutPrompt = renderRolePrompt(closeoutPacket);

    expect(
      reviewerPacket.contextRefs.some(
        (ref) => ref.path === ".threadsmith/runs/run-prev/result.md"
      )
    ).toBe(true);
    expect(reviewerPrompt).toContain("ready-for-verification");
    expect(reviewerPrompt).toContain("review-blocked");
    expect(reviewerPacket.protocolInstruction?.protocol.id).toBe("review");
    expect(reviewerPrompt).toContain("Do not convert review confidence into verification pass.");
    expect(reviewerPacket.contextRefs.some((ref) => ref.path === ".threadsmith/project-status.json")).toBe(
      false
    );
    expect(reviewerPacket.contextRefs.some((ref) => ref.path === ".threadsmith/project-roadmap.json")).toBe(
      false
    );

    expect(verifierPacket.verification).toEqual(
      expect.arrayContaining(["项目可以从 deck 正常加载"])
    );
    expect(verifierPacket.verificationPolicy?.recommendedLevel).toBe("standard");
    expect(verifierPrompt).toContain("Verification Policy:");
    expect(verifierPrompt).toContain("Level: standard");
    expect(verifierPrompt).toContain("verification-failed");
    expect(verifierPrompt).toContain("accepted-with-closeout-pending");
    expect(verifierPacket.protocolInstruction?.protocol.id).toBe("verify");
    expect(verifierPrompt).toContain("Never convert missing evidence into a pass.");
    expect(verifierPacket.contextRefs.some((ref) => ref.path === ".threadsmith/active-work.json")).toBe(
      false
    );

    expect(closeoutPacket.contextRefs.some((ref) => ref.path.includes("run-prev"))).toBe(
      true
    );
    expect(closeoutPacket.contextRefs.some((ref) => ref.path === ".threadsmith/project-status.json")).toBe(
      true
    );
    expect(closeoutPrompt).toContain("accepted");
    expect(closeoutPrompt).toContain("清理临时痕迹");
    expect(closeoutPacket.protocolInstruction?.protocol.id).toBe("closeout");
  });

  it("does not slim upstream result references out of reviewer and verifier packets", async () => {
    const projectRoot = await createProjectRoot();
    await seedLatestExecutorRun(projectRoot);

    const reviewerPacket = await buildReviewerPacket(projectRoot, "reviewer-run");
    const verifierPacket = await buildVerifierPacket(projectRoot, "verifier-run");
    const verifierPrompt = renderRolePrompt(verifierPacket);

    expect(
      reviewerPacket.contextRefs.some(
        (ref) => ref.path === ".threadsmith/runs/run-prev/result.md"
      )
    ).toBe(true);
    expect(
      verifierPacket.contextRefs.some(
        (ref) => ref.path === ".threadsmith/runs/run-prev/result.md"
      )
    ).toBe(true);
    expect(verifierPacket.verificationPolicy?.requiredChecks).toEqual(
      expect.arrayContaining(["项目可以从 deck 正常加载"])
    );
    expect(verifierPrompt).toContain("Required checks:");
    expect(verifierPrompt).toContain("项目可以从 deck 正常加载");
  });
});
