import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { WritebackProposalReview } from "@threadsmith/domain";
import { writebackProposalReviewSchema } from "@threadsmith/domain";
import {
  THREADSMITH_DIR,
  getProposalReviewsDir,
  getWritebackProposalReviewPath
} from "./paths.ts";

export interface WritebackProposalReviewArtifactSummary {
  proposalId: string;
  reviewId: string;
  decision: WritebackProposalReview["decision"];
  relativePath: string;
  adoptionPlanReady: boolean;
}

function formatReviewContents(review: WritebackProposalReview) {
  return `${JSON.stringify(review, null, 2)}\n`;
}

export async function writeWritebackProposalReviewArtifact(
  projectRoot: string,
  review: WritebackProposalReview
): Promise<WritebackProposalReviewArtifactSummary> {
  const parsed = writebackProposalReviewSchema.parse(review);
  const relativePath = `${THREADSMITH_DIR}/proposal-reviews/${parsed.proposalId}.json`;

  await mkdir(getProposalReviewsDir(projectRoot), { recursive: true });
  await writeFile(
    getWritebackProposalReviewPath(projectRoot, parsed.proposalId),
    formatReviewContents(parsed),
    "utf8"
  );

  return {
    proposalId: parsed.proposalId,
    reviewId: parsed.reviewId,
    decision: parsed.decision,
    relativePath,
    adoptionPlanReady: parsed.decision === "accept-plan"
  };
}

export async function readWritebackProposalReviewArtifact(
  projectRoot: string,
  proposalId: string
) {
  try {
    const contents = await readFile(
      getWritebackProposalReviewPath(projectRoot, proposalId),
      "utf8"
    );

    return writebackProposalReviewSchema.parse(JSON.parse(contents));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}
