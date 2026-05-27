import { appendFile, mkdir, readFile } from "node:fs/promises";
import {
  phaseHistoryEntrySchema,
  type PhaseHistoryEntry
} from "@threadsmith/domain";
import { getHistoryDir, getPhaseHistoryPath } from "./paths.ts";

function formatJsonLine(value: unknown) {
  return `${JSON.stringify(value)}\n`;
}

export async function appendPhaseHistoryEntry(
  projectRoot: string,
  value: PhaseHistoryEntry
) {
  const parsed = phaseHistoryEntrySchema.parse(value);
  await mkdir(getHistoryDir(projectRoot), { recursive: true });
  await appendFile(getPhaseHistoryPath(projectRoot), formatJsonLine(parsed), "utf8");
  return parsed;
}

export interface ReadPhaseHistoryOptions {
  order?: "oldest-first" | "newest-first";
  limit?: number;
}

export async function readPhaseHistory(
  projectRoot: string,
  options: ReadPhaseHistoryOptions = {}
) {
  const order = options.order ?? "oldest-first";
  const limit = options.limit;

  try {
    const contents = await readFile(getPhaseHistoryPath(projectRoot), "utf8");
    const entries = contents
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => phaseHistoryEntrySchema.parse(JSON.parse(line)));
    const ordered =
      order === "newest-first"
        ? [...entries].sort(
            (left, right) =>
              Date.parse(right.createdAt) - Date.parse(left.createdAt)
          )
        : entries;

    return typeof limit === "number" ? ordered.slice(0, limit) : ordered;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function readLatestPhaseHistoryEntry(projectRoot: string) {
  return (await readPhaseHistory(projectRoot, {
    order: "newest-first",
    limit: 1
  }))[0] ?? null;
}

function sameSource(left: PhaseHistoryEntry, right: PhaseHistoryEntry) {
  return (
    left.source.ref !== null &&
    left.source.kind === right.source.kind &&
    left.source.ref === right.source.ref
  );
}

function sameCompletedPhase(left: PhaseHistoryEntry, right: PhaseHistoryEntry) {
  return (
    left.completedAt !== null &&
    left.phaseName === right.phaseName &&
    left.completedAt === right.completedAt
  );
}

function duplicateReason(
  candidate: PhaseHistoryEntry,
  existing: PhaseHistoryEntry[]
) {
  if (existing.some((entry) => entry.id === candidate.id)) {
    return "duplicate-id" as const;
  }

  if (existing.some((entry) => sameSource(entry, candidate))) {
    return "duplicate-source" as const;
  }

  if (existing.some((entry) => sameCompletedPhase(entry, candidate))) {
    return "duplicate-completed-phase" as const;
  }

  return null;
}

export interface BackfillPhaseHistoryOptions {
  write?: boolean;
}

export async function backfillPhaseHistory(
  projectRoot: string,
  candidates: PhaseHistoryEntry[],
  options: BackfillPhaseHistoryOptions = {}
) {
  const existing = await readPhaseHistory(projectRoot);
  const accepted: PhaseHistoryEntry[] = [];
  const skipped: Array<{
    entry: PhaseHistoryEntry;
    reason: NonNullable<ReturnType<typeof duplicateReason>>;
  }> = [];

  for (const candidate of candidates) {
    const parsed = phaseHistoryEntrySchema.parse(candidate);
    const reason = duplicateReason(parsed, [...existing, ...accepted]);

    if (reason) {
      skipped.push({ entry: parsed, reason });
      continue;
    }

    accepted.push(parsed);
  }

  if (options.write) {
    for (const entry of accepted) {
      await appendPhaseHistoryEntry(projectRoot, entry);
    }
  }

  return {
    mode: options.write ? ("write" as const) : ("dry-run" as const),
    accepted,
    skipped,
    existingCount: existing.length,
    acceptedCount: accepted.length,
    skippedCount: skipped.length
  };
}
