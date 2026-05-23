import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ZodType } from "zod";
import {
  acceptanceStateSchema,
  activeWorkSchema,
  currentPhaseSchema,
  projectBriefSchema,
  projectRoadmapSchema,
  projectStatusSchema,
  projectSupervisionStateSchema
} from "@threadsmith/domain";
import type { WritebackProposalReview } from "@threadsmith/domain";
import { THREADSMITH_DIR } from "./paths.ts";
import { readWritebackProposalReviewArtifact } from "./writebackProposalReviews.ts";

const ADOPTABLE_STATE_SCHEMAS = new Map<string, ZodType>([
  [".threadsmith/project-brief.json", projectBriefSchema],
  [".threadsmith/project-status.json", projectStatusSchema],
  [".threadsmith/project-roadmap.json", projectRoadmapSchema],
  [".threadsmith/current-phase.json", currentPhaseSchema],
  [".threadsmith/acceptance-state.json", acceptanceStateSchema],
  [".threadsmith/active-work.json", activeWorkSchema],
  [".threadsmith/project-supervision.json", projectSupervisionStateSchema]
]);

export interface AdoptWritebackProposalOptions {
  adoptedAt?: string;
  actor?: string;
}

export interface AdoptedWritebackProposalStep {
  targetPath: string;
  targetPointer: string | null;
  summary: string;
}

export interface AdoptWritebackProposalResult {
  proposalId: string;
  reviewId: string;
  adoptedAt: string;
  actor: string;
  appliedSteps: AdoptedWritebackProposalStep[];
  committedTruthMutation: "applied";
}

function assertSafeRelativeStatePath(targetPath: string) {
  const schema = ADOPTABLE_STATE_SCHEMAS.get(targetPath);

  if (!schema) {
    throw new Error(
      `Proposal adoption target is not an allowed committed truth file: ${targetPath}`
    );
  }

  if (
    targetPath.includes("..") ||
    targetPath.includes("/proposals/") ||
    targetPath.includes("/proposal-reviews/")
  ) {
    throw new Error(`Unsafe proposal adoption target: ${targetPath}`);
  }

  return schema;
}

function splitJsonPointer(pointer: string) {
  if (!pointer.startsWith("/")) {
    throw new Error(`Unsupported JSON pointer: ${pointer}`);
  }

  return pointer
    .slice(1)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function setJsonPointer(value: unknown, pointer: string | null, proposedValue: unknown) {
  if (pointer === null) {
    return proposedValue;
  }

  const segments = splitJsonPointer(pointer);
  const root = structuredClone(value);
  let cursor: unknown = root;

  for (const segment of segments.slice(0, -1)) {
    if (
      cursor === null ||
      typeof cursor !== "object" ||
      !(segment in cursor)
    ) {
      throw new Error(`Cannot resolve JSON pointer segment "${segment}" in ${pointer}`);
    }

    cursor = (cursor as Record<string, unknown>)[segment];
  }

  const finalSegment = segments.at(-1);
  if (!finalSegment) {
    throw new Error(`Unsupported empty JSON pointer: ${pointer}`);
  }

  if (cursor === null || typeof cursor !== "object") {
    throw new Error(`Cannot set JSON pointer on non-object target: ${pointer}`);
  }

  if (Array.isArray(cursor)) {
    const index = Number(finalSegment);
    if (!Number.isInteger(index) || index < 0 || index >= cursor.length) {
      throw new Error(`Unsupported array JSON pointer index: ${pointer}`);
    }

    cursor[index] = proposedValue;
  } else {
    (cursor as Record<string, unknown>)[finalSegment] = proposedValue;
  }

  return root;
}

async function readJsonFile(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function assertAdoptableReview(review: WritebackProposalReview) {
  if (review.decision !== "accept-plan") {
    throw new Error(
      `Cannot adopt proposal "${review.proposalId}" because review decision is "${review.decision}".`
    );
  }

  if (!review.adoptionPlan) {
    throw new Error(`Cannot adopt proposal "${review.proposalId}" without an adoption plan.`);
  }

  if (!review.adoptionPlan.stopBeforeApply) {
    throw new Error(
      `Cannot adopt proposal "${review.proposalId}" because the adoption plan does not stop before apply.`
    );
  }
}

function stateFilePath(projectRoot: string, targetPath: string) {
  return join(projectRoot, targetPath);
}

export async function adoptWritebackProposalArtifact(
  projectRoot: string,
  proposalId: string,
  options: AdoptWritebackProposalOptions = {}
): Promise<AdoptWritebackProposalResult> {
  const review = await readWritebackProposalReviewArtifact(projectRoot, proposalId);

  if (!review) {
    throw new Error(
      `Writeback proposal review not found: ${THREADSMITH_DIR}/proposal-reviews/${proposalId}.json`
    );
  }

  assertAdoptableReview(review);

  const adoptedAt = options.adoptedAt ?? new Date().toISOString();
  const actor = options.actor ?? "threadsmith";
  const pendingWrites = [];

  for (const step of review.adoptionPlan.steps) {
    const schema = assertSafeRelativeStatePath(step.targetPath);
    const filePath = stateFilePath(projectRoot, step.targetPath);
    const currentValue = await readJsonFile(filePath);
    const nextValue = setJsonPointer(
      currentValue,
      step.targetPointer,
      step.proposedValue
    );
    const parsedNextValue = schema.parse(nextValue);

    pendingWrites.push({
      filePath,
      value: parsedNextValue,
      step: {
        targetPath: step.targetPath,
        targetPointer: step.targetPointer,
        summary: step.summary
      }
    });
  }

  for (const pendingWrite of pendingWrites) {
    await writeJsonFile(pendingWrite.filePath, pendingWrite.value);
  }

  return {
    proposalId: review.proposalId,
    reviewId: review.reviewId,
    adoptedAt,
    actor,
    appliedSteps: pendingWrites.map((item) => item.step),
    committedTruthMutation: "applied"
  };
}
