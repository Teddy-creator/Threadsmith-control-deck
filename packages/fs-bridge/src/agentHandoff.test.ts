import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  readCurrentAgentHandoff,
  writeCurrentAgentHandoff
} from "./agentHandoff.ts";
import { appendEvent } from "./events.ts";
import {
  ensureStateDir,
  loadProjectState,
  writeStateFragment
} from "./fileStore.ts";
import { STATE_FILES } from "./paths.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-agent-handoff-"));
  createdRoots.push(projectRoot);
  await ensureStateDir(projectRoot);
  return projectRoot;
}

async function seedProject(projectRoot: string) {
  await writeStateFragment(projectRoot, STATE_FILES.projectBrief, {
    projectGoal: "Make Threadsmith a cross-agent bridge",
    currentVersionScope: "State store and handoff packet",
    nonGoals: ["External agents directly write committed truth"],
    keyConstraints: ["Committed truth stays authoritative"],
    successFrame: "Another agent can continue safely from a compact handoff.",
    priorityOrder: ["Truth boundary", "Handoff readability"],
    openStrategicQuestions: []
  });

  await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
    phaseName: "Handoff Packet Generator v1",
    phaseGoal: "Generate a fixed handoff projection.",
    deliverable: "current-agent-handoff.md",
    inScope: ["Fixed handoff path"],
    outOfScope: ["Adapter prompts"],
    stopCondition: "Current handoff exists and names safe writeback rules.",
    verificationForThisPhase: ["Run fs-bridge tests"],
    activeOwners: ["executor", "reviewer", "verifier", "closeout"],
    blockedBy: []
  });

  await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
    currentClaim: "A fixed handoff projection can be generated.",
    doneWhenChecklist: [
      {
        id: "handoff",
        label: "current-agent-handoff.md is generated",
        status: "unknown"
      }
    ],
    implementationStatus: "implementing",
    reviewStatus: "not-started",
    verificationStatus: "not-started",
    closeoutStatus: "not-started",
    knownGaps: ["Adapter prompts are deferred."],
    finalState: "not-ready"
  });

  await writeStateFragment(projectRoot, STATE_FILES.activeWork, {
    items: [
      {
        role: "executor",
        status: "running",
        taskSummary: "Build the handoff generator",
        requiresUserDecision: false
      }
    ],
    blockerSummary: null
  });

  await writeStateFragment(projectRoot, STATE_FILES.projectStatus, {
    projectLabel: "Threadsmith",
    currentTrack: "Cross-agent bridge",
    overallState: "in-progress",
    currentFocus: "Build a stable handoff path.",
    projectStatusSummary: "Threadsmith is adding a readable handoff projection.",
    latestAcceptedSlice: null,
    nextPlannedSlice: null,
    currentMilestoneId: "cross-agent-bridge",
    nextMilestoneId: null,
    topRisks: [],
    updatedAt: "2026-05-23T07:00:00.000Z"
  });

  await writeStateFragment(projectRoot, STATE_FILES.preferences, {});
}

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((projectRoot) =>
      rm(projectRoot, { recursive: true, force: true })
    )
  );
});

describe("current agent handoff", () => {
  it("writes a deterministic fixed-path handoff projection with state boundaries", async () => {
    const projectRoot = await createProjectRoot();
    await seedProject(projectRoot);
    await appendEvent(projectRoot, {
      id: "event-1",
      createdAt: "2026-05-23T07:01:00.000Z",
      kind: "workflow-transition",
      title: "Executor started",
      detail: "Implementation is in progress.",
      role: "executor",
      artifactPath: ".threadsmith/runs/example/result.md"
    });

    const state = await loadProjectState(projectRoot);
    const summary = await writeCurrentAgentHandoff(projectRoot, {
      state,
      recentEvents: [
        {
          id: "event-1",
          createdAt: "2026-05-23T07:01:00.000Z",
          kind: "workflow-transition",
          title: "Executor started",
          detail: "Implementation is in progress.",
          role: "executor",
          artifactPath: ".threadsmith/runs/example/result.md"
        }
      ],
      createdAt: "2026-05-23T07:02:00.000Z"
    });
    const contents = await readCurrentAgentHandoff(projectRoot);

    expect(summary.relativePath).toBe(
      ".threadsmith/handoff/current-agent-handoff.md"
    );
    expect(summary.recommendedRole).toBe("executor");
    expect(contents).toContain("# Threadsmith Agent Handoff");
    expect(contents).toContain("- generated at: 2026-05-23T07:02:00.000Z");
    expect(contents).toContain(".threadsmith/current-phase.json");
    expect(contents).toContain(
      "This handoff is a readable projection derived from committed Threadsmith truth. It is not the authority."
    );
    expect(contents).toContain("- current phase: Handoff Packet Generator v1");
    expect(contents).toContain("- acceptance state: not-ready");
    expect(contents).toContain("- recommended role: executor");
    expect(contents).toContain("- action: Build the handoff generator");
    expect(contents).toContain(
      "- affected layer: derived handoff packet over committed truth, not source-of-truth state."
    );
    expect(contents).toContain(
      "- this agent must only propose: committed truth updates, final acceptance, verification pass claims, or scope changes unless routed through Threadsmith gates."
    );
  });
});
