import { describe, expect, it } from "vitest";
import type { AcceptanceState, CurrentPhase } from "@threadsmith/domain";
import { decideVerificationPolicy } from "./verificationPolicy.ts";

function basePhase(override: Partial<CurrentPhase> = {}): CurrentPhase {
  return {
    phaseName: "Docs cleanup",
    phaseGoal: "Tighten the current docs slice",
    deliverable: "Updated plan document",
    inScope: ["docs/plans/current.md"],
    outOfScope: [],
    stopCondition: "Plan is clear enough to continue.",
    verificationForThisPhase: [],
    activeOwners: ["executor", "reviewer", "verifier"],
    blockedBy: [],
    ...override
  };
}

function baseAcceptance(override: Partial<AcceptanceState> = {}): AcceptanceState {
  return {
    currentClaim: "Current slice is in progress.",
    doneWhenChecklist: [],
    implementationStatus: "implementing",
    reviewStatus: "not-started",
    verificationStatus: "not-started",
    closeoutStatus: "not-started",
    knownGaps: [],
    finalState: "not-ready",
    ...override
  };
}

describe("verification policy", () => {
  it("uses narrow verification for focused docs-only slices without declared commands", () => {
    const decision = decideVerificationPolicy({
      phase: basePhase(),
      acceptance: baseAcceptance(),
      changedFiles: ["docs/plans/current.md"],
      commands: []
    });

    expect(decision.recommendedLevel).toBe("narrow");
    expect(decision.requiredChecks).toContain("Inspect the changed artifacts directly.");
  });

  it("uses standard verification for package/runtime changes", () => {
    const decision = decideVerificationPolicy({
      phase: basePhase({
        phaseName: "Orchestrator behavior",
        phaseGoal: "Update packet routing behavior",
        deliverable: "Runtime code",
        verificationForThisPhase: ["npm run test --workspace @threadsmith/orchestrator"]
      }),
      acceptance: baseAcceptance(),
      changedFiles: ["packages/orchestrator/src/rolePackets.ts"],
      commands: ["npm run test --workspace @threadsmith/orchestrator"]
    });

    expect(decision.recommendedLevel).toBe("standard");
    expect(decision.escalationSignals).toEqual(
      expect.arrayContaining(["state-or-runtime-phase"])
    );
    expect(decision.requiredChecks).toEqual([
      "npm run test --workspace @threadsmith/orchestrator"
    ]);
  });

  it("uses release verification for build, launcher, or public release surfaces", () => {
    const decision = decideVerificationPolicy({
      phase: basePhase({
        phaseName: "v0.3.3 release hardening",
        phaseGoal: "Prepare public release",
        deliverable: "Release candidate",
        verificationForThisPhase: ["npm run build", "npm run verify:release"]
      }),
      acceptance: baseAcceptance(),
      changedFiles: ["README.md", "Open-Threadsmith-App.command"],
      commands: ["npm run build", "npm run verify:release"]
    });

    expect(decision.recommendedLevel).toBe("release");
    expect(decision.escalationSignals).toEqual(
      expect.arrayContaining(["release-command", "release-shaped-phase"])
    );
  });

  it("escalates failed or blocked acceptance to at least standard", () => {
    const decision = decideVerificationPolicy({
      phase: basePhase(),
      acceptance: baseAcceptance({
        reviewStatus: "review-blocked",
        finalState: "review-blocked",
        knownGaps: ["Reviewer found stale truth."]
      }),
      changedFiles: [],
      commands: []
    });

    expect(decision.recommendedLevel).toBe("standard");
    expect(decision.escalationSignals).toContain("failed-or-blocked-acceptance");
  });
});
