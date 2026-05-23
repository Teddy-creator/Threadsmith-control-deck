import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeProjectState, writeStateFragment } from "./fileStore.ts";
import { STATE_FILES } from "./paths.ts";
import { writeWritebackProposalArtifact } from "./writebackProposals.ts";
import { readWritebackProposalReviewArtifact } from "./writebackProposalReviews.ts";
import { reviewWritebackProposalArtifact } from "./writebackProposalWorkflow.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-proposal-workflow-"));
  createdRoots.push(projectRoot);
  await initializeProjectState(projectRoot);
  await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
    phaseName: "Proposal Review Workflow v1",
    phaseGoal: "Review external writeback proposals without applying truth.",
    deliverable: "Proposal review artifact.",
    inScope: ["Review one proposal artifact."],
    outOfScope: ["Apply committed truth automatically."],
    stopCondition: "A review artifact exists and truth remains unchanged.",
    verificationForThisPhase: ["npm test"],
    activeOwners: ["hygiene", "reviewer"],
    blockedBy: []
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
    phaseName: "Proposal Review Workflow v1",
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
        reference: "reviewed adapter contract",
        status: "passed" as const
      }
    ],
    residualRisks: ["Verification still needs to run."],
    recoverIf: ["Committed truth changed after proposal generation."],
    status: "proposed" as const,
    ...overrides
  };
}

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((projectRoot) =>
      rm(projectRoot, { recursive: true, force: true })
    )
  );
});

describe("reviewWritebackProposalArtifact", () => {
  it("creates an accept-plan review with manual adoption steps for safe proposals", async () => {
    const projectRoot = await createProjectRoot();
    await writeWritebackProposalArtifact(projectRoot, proposal());

    const result = await reviewWritebackProposalArtifact(
      projectRoot,
      "claude-review-1",
      { reviewedAt: "2026-05-23T09:00:00.000Z" }
    );
    const stored = await readWritebackProposalReviewArtifact(
      projectRoot,
      "claude-review-1"
    );

    expect(result.summary).toMatchObject({
      proposalId: "claude-review-1",
      decision: "accept-plan",
      adoptionPlanReady: true
    });
    expect(stored?.adoptionPlan?.stopBeforeApply).toBe(true);
    expect(stored?.adoptionPlan?.steps[0]?.applyMode).toBe(
      "manual-threadsmith-gate"
    );
  });

  it("routes stale phase proposals to needs-recovery", async () => {
    const projectRoot = await createProjectRoot();
    await writeWritebackProposalArtifact(
      projectRoot,
      proposal({
        phaseName: "Old Phase"
      })
    );

    const result = await reviewWritebackProposalArtifact(
      projectRoot,
      "claude-review-1",
      { reviewedAt: "2026-05-23T09:00:00.000Z" }
    );

    expect(result.review.decision).toBe("needs-recovery");
    expect(result.review.recoveryActions[0]).toContain("recover/sync");
    expect(result.review.adoptionPlan).toBeNull();
  });

  it("rejects proposals with missing or failed evidence", async () => {
    const projectRoot = await createProjectRoot();
    await writeWritebackProposalArtifact(
      projectRoot,
      proposal({
        evidence: [
          {
            label: "failed check",
            kind: "command" as const,
            reference: "npm test",
            status: "failed" as const
          }
        ]
      })
    );

    const result = await reviewWritebackProposalArtifact(
      projectRoot,
      "claude-review-1",
      { reviewedAt: "2026-05-23T09:00:00.000Z" }
    );

    expect(result.review.decision).toBe("reject");
    expect(result.review.rejectionReasons[0]).toContain("evidence");
    expect(result.review.adoptionPlan).toBeNull();
  });
});
