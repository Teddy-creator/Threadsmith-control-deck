import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getStatePath, STATE_FILES } from "./paths.ts";
import { initializeProjectState, writeStateFragment } from "./fileStore.ts";
import { writeWritebackProposalArtifact } from "./writebackProposals.ts";
import { reviewWritebackProposalArtifact } from "./writebackProposalWorkflow.ts";
import { adoptWritebackProposalArtifact } from "./writebackProposalAdoption.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-proposal-adoption-"));
  createdRoots.push(projectRoot);
  await initializeProjectState(projectRoot);
  await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
    phaseName: "Proposal Adoption v1",
    phaseGoal: "Adopt an accepted writeback proposal through an explicit gate.",
    deliverable: "Updated committed truth.",
    inScope: ["Adopt one reviewed proposal."],
    outOfScope: ["Automatic external-agent writes."],
    stopCondition: "Committed truth update is explicit and schema-valid.",
    verificationForThisPhase: ["npm test"],
    activeOwners: ["hygiene", "reviewer"],
    blockedBy: []
  });
  await writeStateFragment(projectRoot, STATE_FILES.projectStatus, {
    projectLabel: "Proposal Adoption Fixture",
    currentTrack: "cross-agent bridge",
    overallState: "in-progress",
    currentFocus: "Testing proposal adoption.",
    projectStatusSummary: "Fixture state for proposal adoption.",
    latestAcceptedSlice: null,
    nextPlannedSlice: {
      title: "Proposal Adoption v1",
      recordedAt: null
    },
    currentMilestoneId: "bridge-v1",
    nextMilestoneId: null,
    topRisks: [],
    updatedAt: "2026-05-23T08:00:00.000Z"
  });
  return projectRoot;
}

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    proposalId: "claude-review-1",
    createdAt: "2026-05-23T08:20:00.000Z",
    agent: {
      id: "claude-cli",
      kind: "external-known" as const,
      provider: "claude"
    },
    role: "reviewer" as const,
    phaseName: "Proposal Adoption v1",
    summary: "Suggest review status update.",
    proposedTruthUpdates: [
      {
        targetPath: ".threadsmith/acceptance-state.json",
        targetPointer: "/reviewStatus",
        summary: "Move review to ready-for-verification.",
        proposedValue: "ready-for-verification"
      }
    ],
    evidence: [
      {
        label: "review note",
        kind: "note" as const,
        reference: "external reviewer output",
        status: "passed" as const
      }
    ],
    residualRisks: ["Verification still needs to run."],
    recoverIf: ["Committed truth changed after proposal generation."],
    status: "proposed" as const,
    ...overrides
  };
}

async function readAcceptanceState(projectRoot: string) {
  return JSON.parse(
    await readFile(getStatePath(projectRoot, STATE_FILES.acceptanceState), "utf8")
  ) as { reviewStatus: string };
}

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((projectRoot) =>
      rm(projectRoot, { recursive: true, force: true })
    )
  );
});

describe("adoptWritebackProposalArtifact", () => {
  it("applies an accept-plan adoption plan through an explicit gate", async () => {
    const projectRoot = await createProjectRoot();
    await writeWritebackProposalArtifact(projectRoot, proposal());
    await reviewWritebackProposalArtifact(projectRoot, "claude-review-1", {
      reviewedAt: "2026-05-23T08:30:00.000Z"
    });

    expect((await readAcceptanceState(projectRoot)).reviewStatus).toBe(
      "not-started"
    );

    const result = await adoptWritebackProposalArtifact(
      projectRoot,
      "claude-review-1",
      {
        adoptedAt: "2026-05-23T08:31:00.000Z",
        actor: "threadsmith-test"
      }
    );

    expect(result).toMatchObject({
      proposalId: "claude-review-1",
      committedTruthMutation: "applied",
      actor: "threadsmith-test"
    });
    expect(result.appliedSteps[0]).toMatchObject({
      targetPath: ".threadsmith/acceptance-state.json",
      targetPointer: "/reviewStatus"
    });
    expect((await readAcceptanceState(projectRoot)).reviewStatus).toBe(
      "ready-for-verification"
    );
  });

  it("refuses to adopt before a proposal has an accept-plan review", async () => {
    const projectRoot = await createProjectRoot();
    await writeWritebackProposalArtifact(projectRoot, proposal());

    await expect(
      adoptWritebackProposalArtifact(projectRoot, "claude-review-1")
    ).rejects.toThrow("proposal review not found");
  });

  it("refuses adoption targets outside allowed committed truth files", async () => {
    const projectRoot = await createProjectRoot();
    await writeWritebackProposalArtifact(
      projectRoot,
      proposal({
        proposedTruthUpdates: [
          {
            targetPath: ".threadsmith/context/current-packet.json",
            targetPointer: "/summary",
            summary: "Try to mutate derived context.",
            proposedValue: "unsafe"
          }
        ]
      })
    );
    await reviewWritebackProposalArtifact(projectRoot, "claude-review-1", {
      reviewedAt: "2026-05-23T08:30:00.000Z"
    });

    await expect(
      adoptWritebackProposalArtifact(projectRoot, "claude-review-1")
    ).rejects.toThrow("not an allowed committed truth file");
  });

  it("validates resulting state before writing", async () => {
    const projectRoot = await createProjectRoot();
    await writeWritebackProposalArtifact(
      projectRoot,
      proposal({
        proposedTruthUpdates: [
          {
            targetPath: ".threadsmith/acceptance-state.json",
            targetPointer: "/reviewStatus",
            summary: "Try to write an invalid review status.",
            proposedValue: "definitely-invalid"
          }
        ]
      })
    );
    await reviewWritebackProposalArtifact(projectRoot, "claude-review-1", {
      reviewedAt: "2026-05-23T08:30:00.000Z"
    });

    await expect(
      adoptWritebackProposalArtifact(projectRoot, "claude-review-1")
    ).rejects.toThrow();
    expect((await readAcceptanceState(projectRoot)).reviewStatus).toBe(
      "not-started"
    );
  });
});
