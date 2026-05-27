import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generatePhaseHistoryBackfillCandidates } from "./phaseHistoryCandidates.ts";
import { appendPhaseHistoryEntry } from "./phaseHistory.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(
    join(tmpdir(), "threadsmith-phase-history-candidates-")
  );
  createdRoots.push(projectRoot);
  return projectRoot;
}

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((projectRoot) =>
      rm(projectRoot, { recursive: true, force: true })
    )
  );
});

async function writePlan(projectRoot: string, fileName: string, markdown: string) {
  const plansDir = join(projectRoot, "docs", "plans");
  await mkdir(plansDir, { recursive: true });
  await writeFile(join(plansDir, fileName), markdown, "utf8");
}

describe("phaseHistoryCandidates", () => {
  it("generates dry-run backfill candidates from plan documents", async () => {
    const projectRoot = await createProjectRoot();
    await writePlan(
      projectRoot,
      "sample-phase.md",
      `# Sample Phase

## Goal

Make the project easier to understand.

## Scope

- Add a map
- Add tests

## Verification

- npm test
`
    );

    const report = await generatePhaseHistoryBackfillCandidates(projectRoot);

    expect(report.mode).toBe("dry-run");
    expect(report.generatedCount).toBe(1);
    expect(report.acceptedCount).toBe(1);
    expect(report.skippedCount).toBe(0);
    expect(report.candidates[0]?.entry.phaseName).toBe("Sample Phase");
    expect(report.candidates[0]?.entry.deliverables).toEqual([
      "Add a map",
      "Add tests"
    ]);
    expect(report.candidates[0]?.entry.verification).toEqual(["npm test"]);
    expect(report.candidates[0]?.entry.source.ref).toBe(
      "docs/plans/sample-phase.md"
    );
  });

  it("uses existing phase history to report skipped candidates", async () => {
    const projectRoot = await createProjectRoot();
    await writePlan(projectRoot, "duplicate.md", "# Duplicate Phase\n");
    const firstReport = await generatePhaseHistoryBackfillCandidates(projectRoot);
    const candidate = firstReport.candidates[0]?.entry;

    if (!candidate) {
      throw new Error("expected a generated candidate");
    }

    await appendPhaseHistoryEntry(projectRoot, candidate);

    const secondReport = await generatePhaseHistoryBackfillCandidates(projectRoot);

    expect(secondReport.generatedCount).toBe(1);
    expect(secondReport.acceptedCount).toBe(0);
    expect(secondReport.skippedCount).toBe(1);
    expect(secondReport.preview.skipped[0]?.reason).toBe("duplicate-id");
  });

  it("can write candidate entries to a JSON file for later review", async () => {
    const projectRoot = await createProjectRoot();
    const outputPath = join(projectRoot, "candidates.json");
    await writePlan(projectRoot, "output.md", "# Output Phase\n");

    await generatePhaseHistoryBackfillCandidates(projectRoot, { outputPath });

    const output = JSON.parse(await readFile(outputPath, "utf8"));
    expect(output).toHaveLength(1);
    expect(output[0].phaseName).toBe("Output Phase");
  });
});
