import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  readAgentAdapterPrompt,
  writeAgentAdapterPrompts
} from "./agentAdapters.ts";
import {
  ensureStateDir,
  loadProjectState,
  writeStateFragment
} from "./fileStore.ts";
import { STATE_FILES } from "./paths.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-agent-adapters-"));
  createdRoots.push(projectRoot);
  await ensureStateDir(projectRoot);
  return projectRoot;
}

async function seedProject(projectRoot: string) {
  await writeStateFragment(projectRoot, STATE_FILES.projectBrief, {
    projectGoal: "Make Threadsmith a cross-agent bridge",
    currentVersionScope: "Adapter prompts",
    nonGoals: ["External agents directly write committed truth"],
    keyConstraints: ["Committed truth stays authoritative"],
    successFrame: "Different agents can read safe adapter prompts.",
    priorityOrder: ["Safety", "Provider neutrality"],
    openStrategicQuestions: []
  });

  await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
    phaseName: "Adapter Prompt Generator v1",
    phaseGoal: "Generate provider-safe adapter prompts.",
    deliverable: "Codex, Claude, and generic adapter prompts",
    inScope: ["Adapter prompt files"],
    outOfScope: ["Writeback proposal parser"],
    stopCondition: "Adapter prompts exist and preserve truth boundaries.",
    verificationForThisPhase: ["Run fs-bridge tests"],
    activeOwners: ["executor", "reviewer", "verifier", "closeout"],
    blockedBy: []
  });

  await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
    currentClaim: "Adapter prompts can be generated safely.",
    doneWhenChecklist: [
      {
        id: "adapter-prompts",
        label: "Adapter prompts are generated",
        status: "unknown"
      }
    ],
    implementationStatus: "implementing",
    reviewStatus: "not-started",
    verificationStatus: "not-started",
    closeoutStatus: "not-started",
    knownGaps: ["Writeback proposal parsing is deferred."],
    finalState: "not-ready"
  });

  await writeStateFragment(projectRoot, STATE_FILES.activeWork, {
    items: [
      {
        role: "executor",
        status: "running",
        taskSummary: "Build the adapter prompt generator",
        requiresUserDecision: false
      }
    ],
    blockerSummary: null
  });

  await writeStateFragment(projectRoot, STATE_FILES.projectStatus, {
    projectLabel: "Threadsmith",
    currentTrack: "Cross-agent bridge",
    overallState: "in-progress",
    currentFocus: "Build safe adapter prompts.",
    projectStatusSummary: "Threadsmith is adding provider-safe adapter prompts.",
    latestAcceptedSlice: null,
    nextPlannedSlice: null,
    currentMilestoneId: "cross-agent-bridge",
    nextMilestoneId: null,
    topRisks: [],
    updatedAt: "2026-05-23T07:30:00.000Z"
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

describe("agent adapter prompts", () => {
  it("writes Codex, Claude, and generic adapter prompts with safe truth boundaries", async () => {
    const projectRoot = await createProjectRoot();
    await seedProject(projectRoot);
    const state = await loadProjectState(projectRoot);

    const summary = await writeAgentAdapterPrompts(projectRoot, {
      state,
      createdAt: "2026-05-23T07:31:00.000Z"
    });
    const codex = await readAgentAdapterPrompt(projectRoot, "codex");
    const claude = await readAgentAdapterPrompt(projectRoot, "claude");
    const generic = await readAgentAdapterPrompt(projectRoot, "generic-agent");

    expect(summary.adapters.map((adapter) => adapter.relativePath)).toEqual([
      ".threadsmith/adapters/codex.md",
      ".threadsmith/adapters/claude.md",
      ".threadsmith/adapters/generic-agent.md"
    ]);
    expect(codex).toContain("# Threadsmith Adapter: Codex");
    expect(codex).toContain("Use `$threadsmith` as the native supervisor entry");
    expect(codex).toContain("`recover`: stop normal work");
    expect(claude).toContain("# Threadsmith Adapter: Claude");
    expect(claude).toContain("Default to read-only access for committed `.threadsmith/` truth.");
    expect(claude).toContain("Return a writeback proposal");
    expect(generic).toContain("# Threadsmith Adapter: Generic Agent");
    expect(generic).toContain(".threadsmith/handoff/current-agent-handoff.md");
    expect(generic).toContain(
      "current-agent-handoff.md is missing, stale, or references a different phase."
    );
    expect(generic).toContain(
      ".threadsmith/handoff/current-agent-handoff.md is a readable projection. It is not the authority."
    );
  });
});
