import { describe, expect, it } from "vitest";
import {
  createWritebackProposal,
  writebackProposalSchema
} from "./writebackProposal.ts";

const baseProposal = {
  proposalId: "claude-review-1",
  createdAt: "2026-05-23T08:10:00.000Z",
  agent: {
    id: "claude-cli",
    kind: "external-known" as const,
    provider: "claude"
  },
  role: "reviewer" as const,
  phaseName: "Writeback Proposal Contract v1",
  summary: "Reviewer suggests moving the current slice toward verification.",
  proposedTruthUpdates: [
    {
      targetPath: ".threadsmith/acceptance-state.json",
      targetPointer: "/reviewStatus",
      summary: "Mark review ready for verification.",
      proposedValue: "ready-for-verification"
    }
  ],
  evidence: [
    {
      label: "targeted review",
      kind: "note" as const,
      reference: "review notes in current thread",
      status: "passed" as const
    }
  ],
  residualRisks: ["Verification has not run yet."],
  recoverIf: ["Committed truth changed after this proposal was generated."],
  status: "proposed" as const
};

describe("writebackProposalSchema", () => {
  it("accepts an external agent writeback proposal without granting direct truth writes", () => {
    const parsed = createWritebackProposal(baseProposal);

    expect(parsed.agent.kind).toBe("external-known");
    expect(parsed.status).toBe("proposed");
    expect(parsed.proposedTruthUpdates[0]?.targetPath).toBe(
      ".threadsmith/acceptance-state.json"
    );
  });

  it("rejects external agent proposals that self-accept committed truth", () => {
    expect(() =>
      writebackProposalSchema.parse({
        ...baseProposal,
        status: "accepted"
      })
    ).toThrow(/cannot self-accept/);
  });

  it("requires final acceptance proposals to include evidence", () => {
    expect(() =>
      writebackProposalSchema.parse({
        ...baseProposal,
        proposedTruthUpdates: [
          {
            targetPath: ".threadsmith/acceptance-state.json",
            targetPointer: "/finalState",
            summary: "Propose final acceptance.",
            proposedValue: "accepted"
          }
        ],
        evidence: []
      })
    ).toThrow(/require evidence/);
  });

  it("rejects non-Threadsmith targets and proposal self-mutation", () => {
    expect(() =>
      writebackProposalSchema.parse({
        ...baseProposal,
        proposedTruthUpdates: [
          {
            targetPath: "src/app.ts",
            targetPointer: null,
            summary: "Try to update source.",
            proposedValue: "changed"
          }
        ]
      })
    ).toThrow(/must target Threadsmith project state/);

    expect(() =>
      writebackProposalSchema.parse({
        ...baseProposal,
        proposedTruthUpdates: [
          {
            targetPath: ".threadsmith/proposals/other.json",
            targetPointer: null,
            summary: "Try to mutate a proposal artifact.",
            proposedValue: "changed"
          }
        ]
      })
    ).toThrow(/cannot propose updates to proposal artifacts/);
  });
});
