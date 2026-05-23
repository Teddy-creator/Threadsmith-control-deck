import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  readWritebackProposalArtifact,
  writeWritebackProposalArtifact
} from "./writebackProposals.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-proposals-"));
  createdRoots.push(projectRoot);
  return projectRoot;
}

const proposal = {
  proposalId: "claude-review-1",
  createdAt: "2026-05-23T08:20:00.000Z",
  agent: {
    id: "claude-cli",
    kind: "external-known" as const,
    provider: "claude"
  },
  role: "reviewer" as const,
  phaseName: "Writeback Proposal Contract v1",
  summary: "Suggest review status update.",
  proposedTruthUpdates: [
    {
      targetPath: ".threadsmith/acceptance-state.json",
      targetPointer: "/reviewStatus",
      summary: "Move review to ready-for-verification.",
      proposedValue: "ready-for-verification"
    }
  ],
  evidence: [
    {
      label: "review note",
      kind: "note" as const,
      reference: "reviewed adapter contract",
      status: "passed" as const
    }
  ],
  residualRisks: ["Verification still needs to run."],
  recoverIf: ["Committed truth changed after proposal generation."],
  status: "proposed" as const
};

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((projectRoot) =>
      rm(projectRoot, { recursive: true, force: true })
    )
  );
});

describe("writeback proposal artifacts", () => {
  it("writes and reads a validated proposal under .threadsmith/proposals", async () => {
    const projectRoot = await createProjectRoot();

    const summary = await writeWritebackProposalArtifact(projectRoot, proposal);
    const stored = await readWritebackProposalArtifact(
      projectRoot,
      proposal.proposalId
    );

    expect(summary).toEqual({
      proposalId: "claude-review-1",
      status: "proposed",
      phaseName: "Writeback Proposal Contract v1",
      relativePath: ".threadsmith/proposals/claude-review-1.json"
    });
    expect(stored?.summary).toBe("Suggest review status update.");
    expect(stored?.proposedTruthUpdates[0]?.targetPath).toBe(
      ".threadsmith/acceptance-state.json"
    );
  });

  it("rejects unsafe proposal artifacts before writing", async () => {
    const projectRoot = await createProjectRoot();

    await expect(
      writeWritebackProposalArtifact(projectRoot, {
        ...proposal,
        status: "accepted"
      })
    ).rejects.toThrow(/cannot self-accept/);
  });
});
