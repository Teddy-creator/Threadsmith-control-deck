import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createManualAdoptionPlan } from "@threadsmith/domain";
import {
  STATE_FILES,
  getStatePath,
  getWritebackProposalPath,
  getWritebackProposalReviewPath,
  readWritebackProposalArtifact,
  readWritebackProposalReviewArtifact,
  writeWritebackProposalArtifact,
  writeWritebackProposalReviewArtifact
} from "@threadsmith/fs-bridge";

const proposalId = "external-review-smoke";

const proposal = {
  proposalId,
  createdAt: "2026-05-23T09:20:00.000Z",
  agent: {
    id: "external-agent-smoke",
    kind: "external-known" as const,
    provider: "generic-agent"
  },
  role: "reviewer" as const,
  phaseName: "Cross-Agent State Bridge Smoke v1",
  summary:
    "External agent proposes a review status update for Threadsmith to inspect.",
  proposedTruthUpdates: [
    {
      targetPath: ".threadsmith/acceptance-state.json",
      targetPointer: "/reviewStatus",
      summary: "Move review status to ready-for-verification.",
      proposedValue: "ready-for-verification"
    }
  ],
  evidence: [
    {
      label: "external review note",
      kind: "note" as const,
      reference: "simulated external agent review",
      status: "passed" as const
    }
  ],
  residualRisks: ["Verification has not run yet."],
  recoverIf: ["Committed truth changed after the proposal was generated."],
  status: "proposed" as const
};

async function assertExists(path: string) {
  await access(path);
}

async function assertNoCommittedTruthAdoption(projectRoot: string) {
  const acceptancePath = getStatePath(projectRoot, STATE_FILES.acceptanceState);

  if (existsSync(acceptancePath)) {
    const contents = await readFile(acceptancePath, "utf8");
    if (contents.includes("ready-for-verification")) {
      throw new Error(
        "accept-plan unexpectedly modified committed acceptance truth."
      );
    }
  }
}

async function main() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-state-bridge-smoke-"));

  try {
    const proposalSummary = await writeWritebackProposalArtifact(
      projectRoot,
      proposal
    );
    const storedProposal = await readWritebackProposalArtifact(
      projectRoot,
      proposalId
    );

    if (!storedProposal) {
      throw new Error("proposal artifact was not readable after write.");
    }

    const adoptionPlan = createManualAdoptionPlan({
      proposalId,
      phaseName: proposal.phaseName,
      proposedTruthUpdates: storedProposal.proposedTruthUpdates,
      requiresRoles: ["hygiene", "reviewer"]
    });

    const review = {
      reviewId: "review-external-review-smoke",
      proposalId,
      reviewedAt: "2026-05-23T09:21:00.000Z",
      reviewer: {
        role: "hygiene" as const,
        provider: "codex"
      },
      decision: "accept-plan" as const,
      summary:
        "Threadsmith reviewed the external proposal and produced a manual adoption plan.",
      evidence: [
        {
          label: "proposal artifact checked",
          reference: proposalSummary.relativePath,
          status: "checked" as const
        }
      ],
      adoptionPlan,
      rejectionReasons: [],
      recoveryActions: [],
      sourceProposal: storedProposal
    };

    const reviewSummary = await writeWritebackProposalReviewArtifact(
      projectRoot,
      review
    );
    const storedReview = await readWritebackProposalReviewArtifact(
      projectRoot,
      proposalId
    );

    if (!storedReview) {
      throw new Error("proposal review artifact was not readable after write.");
    }

    if (!storedReview.adoptionPlan?.stopBeforeApply) {
      throw new Error("adoption plan does not stop before apply.");
    }

    if (
      storedReview.adoptionPlan.steps.some(
        (step) => step.applyMode !== "manual-threadsmith-gate"
      )
    ) {
      throw new Error("adoption plan step bypasses manual Threadsmith gate.");
    }

    await assertExists(getWritebackProposalPath(projectRoot, proposalId));
    await assertExists(getWritebackProposalReviewPath(projectRoot, proposalId));
    await assertNoCommittedTruthAdoption(projectRoot);

    console.log(
      JSON.stringify(
        {
          mode: "isolated",
          projectRoot,
          proposal: proposalSummary,
          review: reviewSummary,
          adoptionPlanReady: reviewSummary.adoptionPlanReady,
          committedTruthMutation: "none",
          applyMode: storedReview.adoptionPlan.steps[0]?.applyMode ?? null
        },
        null,
        2
      )
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
