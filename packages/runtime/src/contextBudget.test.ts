import { describe, expect, it } from "vitest";
import { buildContextBudgetLedger } from "./contextBudget.ts";

describe("buildContextBudgetLedger", () => {
  it("marks a small packet body as compact", () => {
    const ledger = buildContextBudgetLedger({
      project: {
        label: "Threadsmith",
        summary: "Compact project state."
      },
      nextStep: {
        label: "Continue",
        rationale: "Move to the next narrow slice."
      }
    });

    expect(ledger.budgetLevel).toBe("compact");
    expect(ledger.method).toBe("heuristic-json-char-estimate-v1");
    expect(ledger.estimatedChars).toBeGreaterThan(0);
    expect(ledger.estimatedTokens).toBe(Math.ceil(ledger.estimatedChars / 4));
    expect(ledger.warnings).toEqual([]);
  });

  it("warns when a packet crosses the watch threshold", () => {
    const ledger = buildContextBudgetLedger(
      {
        scope: {
          inScope: Array.from({ length: 6 }, (_, index) =>
            `Scope item ${index}: keep this item concise but still present.`
          )
        },
        evidence: {
          commands: [
            {
              command: "npm run test",
              status: "passed",
              summary: "All tests passed."
            }
          ]
        }
      },
      {
        watchChars: 240,
        heavyChars: 1_000,
        overBudgetChars: 2_000
      }
    );

    expect(ledger.budgetLevel).toBe("watch");
    expect(ledger.warnings).toContain(
      "Context Packet is approaching the watch threshold."
    );
    expect(ledger.heaviestSections[0]?.section).toBe("scope");
  });

  it("identifies heavy sections and gives compression advice", () => {
    const ledger = buildContextBudgetLedger(
      {
        acceptance: {
          knownGaps: Array.from({ length: 20 }, (_, index) =>
            `Known gap ${index}: this should be summarized before handoff.`
          )
        },
        relevantFiles: Array.from({ length: 18 }, (_, index) => ({
          path: `packages/example-${index}.ts`,
          reason: "Changed file from current git status.",
          source: "repo-map"
        }))
      },
      {
        watchChars: 300,
        heavyChars: 800,
        overBudgetChars: 1_200,
        sectionItemWatch: 4,
        sectionItemHeavy: 10
      }
    );

    expect(ledger.budgetLevel).toBe("over-budget");
    expect(ledger.sections.find((section) => section.section === "acceptance")?.level)
      .toBe("heavy");
    expect(ledger.sections.find((section) => section.section === "relevantFiles")?.level)
      .toBe("over-budget");
    expect(ledger.compressionAdvice).toEqual(
      expect.arrayContaining([
        expect.stringContaining("acceptance:"),
        expect.stringContaining("relevantFiles:")
      ])
    );
  });

  it("warns about lost-in-the-middle risk when middle sections get heavy", () => {
    const ledger = buildContextBudgetLedger(
      {
        project: { label: "Threadsmith" },
        acceptance: {
          knownGaps: Array.from({ length: 12 }, (_, index) =>
            `Known gap ${index}: keep only decision-changing acceptance truth in role packets.`
          )
        },
        nextStep: { label: "Continue" }
      },
      {
        watchChars: 300,
        heavyChars: 650,
        overBudgetChars: 2_000,
        sectionItemWatch: 4,
        sectionItemHeavy: 10
      }
    );

    expect(ledger.sections.find((section) => section.section === "acceptance")?.level)
      .toBe("heavy");
    expect(ledger.warnings).toContain(
      "Lost-in-the-middle risk: acceptance is heavy in the middle of the packet; route only the role-specific subset."
    );
  });

  it("keeps current packets oriented around recent decisions instead of full history", () => {
    const ledger = buildContextBudgetLedger({
      project: { label: "Threadsmith" },
      recentDecisions: Array.from({ length: 7 }, (_, index) => ({
        title: `Accepted slice ${index}`,
        summary: "Historical accepted work."
      })),
      nextStep: { label: "Continue current work session" }
    });

    expect(ledger.warnings).toContain(
      "recentDecisions has 7 items; current packets should keep only recent 3-5 accepted slices or decisions."
    );
    expect(ledger.compressionAdvice).toEqual(
      expect.arrayContaining([expect.stringContaining("recentDecisions:")])
    );
  });

  it("preserves latest failed verification as high-signal current evidence", () => {
    const ledger = buildContextBudgetLedger({
      evidence: {
        latestFailedVerification: {
          command: "npm run test --workspace @threadsmith/runtime",
          result: "failed",
          summary: "nextBestStep test failed on audit boundary expectation."
        }
      },
      nextStep: { label: "Repair failed verification" }
    });

    expect(ledger.budgetLevel).toBe("compact");
    expect(ledger.warnings).toEqual([]);
    expect(ledger.sections.find((section) => section.section === "evidence"))
      ?.toMatchObject({ level: "compact", itemCount: 1 });
  });
});
