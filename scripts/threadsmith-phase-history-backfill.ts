import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { phaseHistoryEntrySchema } from "@threadsmith/domain";
import { backfillPhaseHistory } from "@threadsmith/fs-bridge";
import { z } from "zod";

const args = process.argv.slice(2);
const write = args.includes("--write");
const positional = args.filter((arg) => arg !== "--write");
const projectRoot = resolve(positional[0] ?? process.cwd());
const inputPath = positional[1] ? resolve(positional[1]) : null;

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

  console.log(
    JSON.stringify(
      {
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
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Threadsmith phase history backfill failed");
  console.error(`Project root: ${projectRoot}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
