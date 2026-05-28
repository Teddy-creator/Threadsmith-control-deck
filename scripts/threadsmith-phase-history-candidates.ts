import { resolve } from "node:path";
import { generatePhaseHistoryBackfillCandidates } from "@threadsmith/fs-bridge";

const args = process.argv.slice(2);
const projectRoot = resolve(args[0] ?? process.cwd());
const outputIndex = args.indexOf("--output");
const outputPath =
  outputIndex >= 0 && args[outputIndex + 1]
    ? resolve(args[outputIndex + 1])
    : null;

async function main() {
  const report = await generatePhaseHistoryBackfillCandidates(projectRoot, {
    outputPath: outputPath ?? undefined
  });

  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        projectRoot,
        generatedCount: report.generatedCount,
        acceptedCount: report.acceptedCount,
        skippedCount: report.skippedCount,
        outputPath,
        accepted: report.preview.accepted.map((entry) => ({
          id: entry.id,
          phaseName: entry.phaseName,
          evidenceRefs: entry.evidenceRefs,
          source: entry.source
        })),
        skipped: report.preview.skipped.map((item) => ({
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
  console.error("Threadsmith phase history candidate generation failed");
  console.error(`Project root: ${projectRoot}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
