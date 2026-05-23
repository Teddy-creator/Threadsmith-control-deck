import { reviewWritebackProposalArtifact } from "@threadsmith/fs-bridge";
import { resolve } from "node:path";

const projectRoot = resolve(process.argv[2] ?? process.cwd());
const proposalId = process.argv[3];

async function main() {
  if (!proposalId) {
    throw new Error(
      "Missing proposal id. Usage: npm run threadsmith:review-proposal -- <project-root> <proposal-id>"
    );
  }

  const result = await reviewWritebackProposalArtifact(projectRoot, proposalId);

  console.log(
    JSON.stringify(
      {
        projectRoot,
        proposalId,
        decision: result.review.decision,
        relativePath: result.summary.relativePath,
        adoptionPlanReady: result.summary.adoptionPlanReady,
        summary: result.review.summary,
        rejectionReasons: result.review.rejectionReasons,
        recoveryActions: result.review.recoveryActions,
        committedTruthMutation: "none"
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Threadsmith proposal review failed");
  console.error(`Project root: ${projectRoot}`);
  if (proposalId) {
    console.error(`Proposal id: ${proposalId}`);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

