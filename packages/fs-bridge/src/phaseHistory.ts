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
