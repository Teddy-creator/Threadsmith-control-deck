import { generatePhaseHistoryBackfillCandidates } from "@threadsmith/fs-bridge";
import {
  failWithThreadsmithError,
  printJson,
  readFlagValue,
  resolvePathArg,
  resolveProjectRootArg
} from "./lib/threadsmithScript.ts";

const args = process.argv.slice(2);
const projectRoot = resolveProjectRootArg(args[0]);
const outputPath = resolvePathArg(readFlagValue(args, "--output"));

async function main() {
  const report = await generatePhaseHistoryBackfillCandidates(projectRoot, {
    outputPath: outputPath ?? undefined
  });

  printJson({
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
  });
}

main().catch((error) => {
  failWithThreadsmithError(
    "Threadsmith phase history candidate generation failed",
    projectRoot,
    error
  );
});
