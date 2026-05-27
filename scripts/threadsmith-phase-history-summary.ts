import { resolve } from "node:path";
import { summarizePhaseHistory } from "@threadsmith/fs-bridge";

const args = process.argv.slice(2);
const limitIndex = args.indexOf("--limit");
const limit =
  limitIndex >= 0 && args[limitIndex + 1]
    ? Number.parseInt(args[limitIndex + 1], 10)
    : 8;
const positional = args.filter(
  (arg, index) => index !== limitIndex && index !== limitIndex + 1
);
const projectRoot = resolve(positional[0] ?? process.cwd());

function formatDate(value: string | null) {
  return value ?? "unknown time";
}

async function main() {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("--limit must be a positive integer");
  }

  const summary = await summarizePhaseHistory(projectRoot, { limit });

  console.log(`Threadsmith Phase History`);
  console.log(`Project root: ${projectRoot}`);
  console.log(`Total phases: ${summary.totalCount}`);

  if (!summary.latest) {
    console.log("Latest phase: none");
    return;
  }

  console.log(
    `Latest phase: ${summary.latest.phaseName} (${summary.latest.result}, ${formatDate(summary.latest.completedAt)})`
  );

  const resultSummary = Object.entries(summary.resultCounts)
    .map(([result, count]) => `${result}: ${count}`)
    .join(", ");
  console.log(`Results: ${resultSummary}`);

  if (summary.nextPhaseHints.length > 0) {
    console.log(`Next phase hints: ${summary.nextPhaseHints.join(" | ")}`);
  }

  console.log("");
  console.log(`Recent phases (${summary.recent.length}):`);
  for (const [index, entry] of summary.recent.entries()) {
    console.log(
      `${index + 1}. ${entry.phaseName} — ${entry.result} — ${formatDate(entry.completedAt)}`
    );
    console.log(`   ${entry.summary}`);
    if (entry.nextPhase) {
      console.log(`   Next: ${entry.nextPhase}`);
    }
  }
}

main().catch((error) => {
  console.error("Threadsmith phase history summary failed");
  console.error(`Project root: ${projectRoot}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
