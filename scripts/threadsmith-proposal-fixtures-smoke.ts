import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ZodError } from "zod";
import type { WritebackProposal } from "@threadsmith/domain";
import {
  STATE_FILES,
  initializeProjectState,
  reviewWritebackProposalArtifact,
  writeStateFragment,
  writeWritebackProposalArtifact
} from "@threadsmith/fs-bridge";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const fixturesDir = join(repoRoot, "docs", "fixtures", "cross-agent-proposals");

const fixtureExpectations = [
  {
    fileName: "happy-path-claude-review.json",
    proposalId: "happy-path-claude-review",
    expected: "accept-plan"
  },
  {
    fileName: "stale-generic-review.json",
    proposalId: "stale-generic-review",
    expected: "needs-recovery"
  },
  {
    fileName: "wrong-phase-codex-review.json",
    proposalId: "wrong-phase-codex-review",
    expected: "needs-recovery"
  },
  {
    fileName: "unsafe-self-acceptance.json",
    proposalId: "unsafe-self-acceptance",
    expected: "schema-rejected"
  }
] as const;

async function readFixture(fileName: string): Promise<WritebackProposal> {
  const contents = await readFile(join(fixturesDir, fileName), "utf8");
  return JSON.parse(contents) as WritebackProposal;
}

async function prepareProject(projectRoot: string) {
  await initializeProjectState(projectRoot);
  await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
    phaseName: "External-Agent Fixture Pack Smoke",
    phaseGoal: "Review fixture proposals without applying committed truth.",
    deliverable: "Proposal fixture review decisions.",
    inScope: ["Review proposal fixtures."],
    outOfScope: ["Apply committed truth automatically."],
    stopCondition: "Fixtures produce expected decisions.",
    verificationForThisPhase: ["npm run smoke:proposal-fixtures"],
    activeOwners: ["hygiene", "reviewer", "verifier"],
    blockedBy: []
  });
  await writeStateFragment(projectRoot, STATE_FILES.projectStatus, {
    projectLabel: "Proposal Fixture Smoke",
    currentTrack: "cross-agent bridge fixtures",
    overallState: "stable",
    currentFocus: "Review proposal fixtures.",
    projectStatusSummary: "Temporary project for proposal fixture smoke.",
    latestAcceptedSlice: null,
    nextPlannedSlice: null,
    currentMilestoneId: null,
    nextMilestoneId: null,
    topRisks: [],
    updatedAt: "2026-05-23T14:00:00.000Z"
  });
}

async function main() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-proposal-fixtures-"));
  const results: Array<{
    fileName: string;
    proposalId: string;
    expected: string;
    actual: string;
  }> = [];

  try {
    await prepareProject(projectRoot);

    for (const expectation of fixtureExpectations) {
      const proposal = await readFixture(expectation.fileName);

      try {
        await writeWritebackProposalArtifact(projectRoot, proposal);

        if (expectation.expected === "schema-rejected") {
          throw new Error(`${expectation.fileName} was expected to fail schema validation.`);
        }

        const review = await reviewWritebackProposalArtifact(
          projectRoot,
          expectation.proposalId,
          {
            reviewedAt: "2026-05-23T14:30:00.000Z"
          }
        );

        if (review.review.decision !== expectation.expected) {
          throw new Error(
            `${expectation.fileName} expected ${expectation.expected} but got ${review.review.decision}.`
          );
        }

        results.push({
          fileName: expectation.fileName,
          proposalId: expectation.proposalId,
          expected: expectation.expected,
          actual: review.review.decision
        });
      } catch (error) {
        if (expectation.expected !== "schema-rejected") {
          throw error;
        }

        if (!(error instanceof ZodError)) {
          throw error;
        }

        results.push({
          fileName: expectation.fileName,
          proposalId: expectation.proposalId,
          expected: expectation.expected,
          actual: "schema-rejected"
        });
      }
    }

    console.log(
      JSON.stringify(
        {
          mode: "isolated",
          projectRoot,
          fixtureCount: results.length,
          results
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
