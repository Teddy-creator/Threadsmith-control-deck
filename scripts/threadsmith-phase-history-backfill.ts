import { readFile } from "node:fs/promises";
import { phaseHistoryEntrySchema } from "@threadsmith/domain";
import { backfillPhaseHistory } from "@threadsmith/fs-bridge";
import { z } from "zod";
import {
  failWithThreadsmithError,
  hasFlag,
  positionalArgs,
  printJson,
  resolvePathArg,
  resolveProjectRootArg
} from "./lib/threadsmithScript.ts";

const args = process.argv.slice(2);
const write = hasFlag(args, "--write");
const positional = positionalArgs(args, ["--write"]);
const projectRoot = resolveProjectRootArg(positional[0]);
const inputPath = resolvePathArg(positional[1]);

if (!inputPath) {
  console.error(
    "Usage: npm run threadsmith:phase-history:backfill -- <project-root> <entries.json> [--write]"
  );
  process.exit(1);
}

const candidatesSchema = z.array(phaseHistoryEntrySchema);

async function main() {
  const raw = await readFile(inputPath, "utf8");
  const candidates = candidatesSchema.parse(JSON.parse(raw));
  const result = await backfillPhaseHistory(projectRoot, candidates, { write });

  printJson({
    mode: result.mode,
    projectRoot,
    inputPath,
    existingCount: result.existingCount,
    acceptedCount: result.acceptedCount,
    skippedCount: result.skippedCount,
    accepted: result.accepted.map((entry) => ({
      id: entry.id,
      phaseName: entry.phaseName,
      completedAt: entry.completedAt,
      source: entry.source
    })),
    skipped: result.skipped.map((item) => ({
      id: item.entry.id,
      phaseName: item.entry.phaseName,
      reason: item.reason,
      source: item.entry.source
    }))
  });
}

main().catch((error) => {
  failWithThreadsmithError(
    "Threadsmith phase history backfill failed",
    projectRoot,
    error
  );
});
