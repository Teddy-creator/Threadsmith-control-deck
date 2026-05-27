import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  appendPhaseHistoryEntry,
  backfillPhaseHistory,
  readLatestPhaseHistoryEntry,
  readPhaseHistory
} from "./phaseHistory.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-phase-history-"));
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

function makeEntry(index: number) {
  return {
    id: `phase-history-${index}`,
    phaseName: `Phase ${index}`,
    result: "accepted" as const,
    summary: `Phase ${index} completed.`,
    startedAt: `2026-05-27T0${index}:00:00.000Z`,
    completedAt: `2026-05-27T0${index}:30:00.000Z`,
    deliverables: [`commit ${index}`],
    verification: ["npm test"],
    evidenceRefs: [".threadsmith/acceptance-state.json"],
    nextPhase: index === 1 ? "Phase 2" : null,
    risks: [],
    source: {
      kind: "closeout" as const,
      ref: `.threadsmith/closeouts/phase-${index}.json`
    },
    createdAt: `2026-05-27T0${index}:31:00.000Z`
  };
}

describe("phaseHistory", () => {
  it("reads missing phase history as an empty list", async () => {
    const projectRoot = await createProjectRoot();

    await expect(readPhaseHistory(projectRoot)).resolves.toEqual([]);
    await expect(readLatestPhaseHistoryEntry(projectRoot)).resolves.toBeNull();
  });

  it("appends phase history entries and can read newest first", async () => {
    const projectRoot = await createProjectRoot();

    await appendPhaseHistoryEntry(projectRoot, makeEntry(1));
    await appendPhaseHistoryEntry(projectRoot, makeEntry(2));

    const oldestFirst = await readPhaseHistory(projectRoot);
    const newestFirst = await readPhaseHistory(projectRoot, {
      order: "newest-first"
    });
    const latest = await readLatestPhaseHistoryEntry(projectRoot);

    expect(oldestFirst.map((entry) => entry.phaseName)).toEqual([
      "Phase 1",
      "Phase 2"
    ]);
    expect(newestFirst.map((entry) => entry.phaseName)).toEqual([
      "Phase 2",
      "Phase 1"
    ]);
    expect(latest?.phaseName).toBe("Phase 2");
  });

  it("previews backfill candidates without writing by default", async () => {
    const projectRoot = await createProjectRoot();

    const result = await backfillPhaseHistory(projectRoot, [
      makeEntry(1),
      makeEntry(2)
    ]);

    expect(result.mode).toBe("dry-run");
    expect(result.accepted.map((entry) => entry.phaseName)).toEqual([
      "Phase 1",
      "Phase 2"
    ]);
    expect(result.skipped).toEqual([]);
    await expect(readPhaseHistory(projectRoot)).resolves.toEqual([]);
  });

  it("writes only non-duplicate backfill candidates when explicitly requested", async () => {
    const projectRoot = await createProjectRoot();
    await appendPhaseHistoryEntry(projectRoot, makeEntry(1));

    const duplicateSource = {
      ...makeEntry(3),
      id: "phase-history-3-source-duplicate",
      source: makeEntry(1).source
    };
    const duplicateCompletedPhase = {
      ...makeEntry(2),
      id: "phase-history-2-completed-duplicate-copy",
      source: {
        kind: "closeout" as const,
        ref: ".threadsmith/closeouts/phase-2-copy.json"
      }
    };

    const result = await backfillPhaseHistory(
      projectRoot,
      [makeEntry(1), makeEntry(2), duplicateSource, duplicateCompletedPhase],
      { write: true }
    );
    const history = await readPhaseHistory(projectRoot);

    expect(result.mode).toBe("write");
    expect(result.accepted.map((entry) => entry.id)).toEqual(["phase-history-2"]);
    expect(result.skipped.map((item) => item.reason)).toEqual([
      "duplicate-id",
      "duplicate-source",
      "duplicate-completed-phase"
    ]);
    expect(history.map((entry) => entry.id)).toEqual([
      "phase-history-1",
      "phase-history-2"
    ]);
  });
});
