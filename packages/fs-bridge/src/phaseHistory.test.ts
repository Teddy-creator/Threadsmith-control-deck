import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  appendPhaseHistoryEntry,
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
      ref: ".threadsmith/acceptance-state.json"
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
});
