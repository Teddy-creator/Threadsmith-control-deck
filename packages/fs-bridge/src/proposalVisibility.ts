import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ZodError } from "zod";
import type {
  WritebackProposal,
  WritebackProposalReview
} from "@threadsmith/domain";
import {
  writebackProposalReviewSchema,
  writebackProposalSchema
} from "@threadsmith/domain";
import {
  THREADSMITH_DIR,
  getProposalReviewsDir,
  getProposalsDir
} from "./paths.ts";

export type ProposalVisibilityStatus = "pending" | "reviewed" | "invalid";

export interface ProposalVisibilityItem {
  proposalId: string;
  status: ProposalVisibilityStatus;
  proposalStatus: WritebackProposal["status"] | null;
  phaseName: string | null;
  role: string | null;
  agentId: string | null;
  provider: string | null;
  createdAt: string | null;
  relativePath: string;
  reviewDecision: WritebackProposalReview["decision"] | null;
  reviewPath: string | null;
  recommendedAction: string;
  error: string | null;
}

export interface ProposalVisibilitySummary {
  title: string;
  detail: string;
  projectRoot: string;
  counts: {
    pending: number;
    reviewed: number;
    invalid: number;
    total: number;
  };
  items: ProposalVisibilityItem[];
}

async function listJsonFiles(dir: string) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function readJsonFile(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

function errorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join("; ");
  }

  return error instanceof Error ? error.message : String(error);
}

function proposalRelativePath(proposalId: string) {
  return `${THREADSMITH_DIR}/proposals/${proposalId}.json`;
}

function reviewRelativePath(proposalId: string) {
  return `${THREADSMITH_DIR}/proposal-reviews/${proposalId}.json`;
}

function pendingAction(proposalId: string) {
  return `npm run threadsmith:review-proposal -- . ${proposalId}`;
}

export async function summarizeProposalVisibility(
  projectRoot: string
): Promise<ProposalVisibilitySummary> {
  const proposalFileNames = await listJsonFiles(getProposalsDir(projectRoot));
  const reviewFileNames = await listJsonFiles(getProposalReviewsDir(projectRoot));
  const reviewedProposalIds = new Set<string>();
  const reviewDecisions = new Map<string, WritebackProposalReview["decision"]>();

  for (const fileName of reviewFileNames) {
    const proposalId = fileName.replace(/\.json$/, "");
    try {
      const review = writebackProposalReviewSchema.parse(
        await readJsonFile(join(getProposalReviewsDir(projectRoot), fileName))
      );
      reviewedProposalIds.add(review.proposalId);
      reviewDecisions.set(review.proposalId, review.decision);
    } catch {
      reviewedProposalIds.add(proposalId);
      reviewDecisions.set(proposalId, "needs-recovery");
    }
  }

  const items: ProposalVisibilityItem[] = [];

  for (const fileName of proposalFileNames) {
    const proposalId = fileName.replace(/\.json$/, "");
    const relativePath = proposalRelativePath(proposalId);

    try {
      const proposal = writebackProposalSchema.parse(
        await readJsonFile(join(getProposalsDir(projectRoot), fileName))
      );
      const reviewed = reviewedProposalIds.has(proposal.proposalId);
      const reviewDecision = reviewDecisions.get(proposal.proposalId) ?? null;

      items.push({
        proposalId: proposal.proposalId,
        status: reviewed ? "reviewed" : "pending",
        proposalStatus: proposal.status,
        phaseName: proposal.phaseName,
        role: proposal.role,
        agentId: proposal.agent.id,
        provider: proposal.agent.provider,
        createdAt: proposal.createdAt,
        relativePath,
        reviewDecision,
        reviewPath: reviewed ? reviewRelativePath(proposal.proposalId) : null,
        recommendedAction: reviewed
          ? "No action required unless the review decision needs manual adoption."
          : pendingAction(proposal.proposalId),
        error: null
      });
    } catch (error) {
      items.push({
        proposalId,
        status: "invalid",
        proposalStatus: null,
        phaseName: null,
        role: null,
        agentId: null,
        provider: null,
        createdAt: null,
        relativePath,
        reviewDecision: null,
        reviewPath: null,
        recommendedAction:
          "Do not adopt this proposal. Inspect the artifact, then regenerate or remove it.",
        error: errorMessage(error)
      });
    }
  }

  const counts = {
    pending: items.filter((item) => item.status === "pending").length,
    reviewed: items.filter((item) => item.status === "reviewed").length,
    invalid: items.filter((item) => item.status === "invalid").length,
    total: items.length
  };

  return {
    title: "Threadsmith proposal visibility",
    detail:
      counts.total === 0
        ? "No writeback proposals found."
        : `${counts.pending} pending, ${counts.reviewed} reviewed, ${counts.invalid} invalid proposal artifact(s).`,
    projectRoot,
    counts,
    items
  };
}
