import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { StoredPreferences } from "@threadsmith/domain";
import { storedPreferencesSchema } from "@threadsmith/domain";
import { getStatePath, STATE_FILES } from "./paths.ts";

export interface ProjectCharterDeclineRecord {
  declinedSetup: boolean;
  declineReason: string | null;
  declinedAt: string | null;
}

function formatJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readStoredPreferences(projectRoot: string): Promise<StoredPreferences> {
  try {
    const raw = await readFile(getStatePath(projectRoot, STATE_FILES.preferences), "utf8");
    return storedPreferencesSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return storedPreferencesSchema.parse({});
    }
    throw error;
  }
}

export async function readProjectCharterPreferences(
  projectRoot: string
): Promise<ProjectCharterDeclineRecord> {
  const stored = await readStoredPreferences(projectRoot);
  const charter = stored.projectCharterGate;

  return {
    declinedSetup: charter?.declinedSetup ?? false,
    declineReason: charter?.declineReason ?? null,
    declinedAt: charter?.declinedAt ?? null
  };
}

export async function writeProjectCharterPreferences(
  projectRoot: string,
  value: ProjectCharterDeclineRecord
) {
  const current = await readStoredPreferences(projectRoot);
  const next: StoredPreferences = storedPreferencesSchema.parse({
    ...current,
    projectCharterGate: value
  });
  const filePath = getStatePath(projectRoot, STATE_FILES.preferences);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, formatJson(next), "utf8");
  return next;
}

export async function recordProjectCharterDecline(
  projectRoot: string,
  declineReason: string,
  declinedAt = new Date().toISOString()
) {
  return writeProjectCharterPreferences(projectRoot, {
    declinedSetup: true,
    declineReason,
    declinedAt
  });
}

export async function clearProjectCharterDecline(projectRoot: string) {
  return writeProjectCharterPreferences(projectRoot, {
    declinedSetup: false,
    declineReason: null,
    declinedAt: null
  });
}
