import { describe, expect, it } from "vitest";
import type { ProjectCharterGateInput } from "@threadsmith/domain";
import { evaluateProjectCharterGate } from "./projectCharterGate.ts";

function input(
  overrides: Partial<ProjectCharterGateInput> = {}
): ProjectCharterGateInput {
  const base: ProjectCharterGateInput = {
    mode: "drive",
    riskLevel: "medium",
    mutatesSource: true,
    destructive: false,
    externalSideEffects: false,
    userExplicitlyBypassed: false,
    charter: {
      exists: true,
      sourcePath: "AGENTS.md",
      placeholderOnly: false,
      stale: false,
      missingFields: [],
      fieldAssessments: [],
      contradictsThreadsmithTruth: false,
      declinedSetup: false,
      declineReason: null
    }
  };

  return {
    ...base,
    ...overrides,
    charter: {
      ...base.charter,
      ...overrides.charter
    }
  };
}

describe("evaluateProjectCharterGate", () => {
  it("passes when a useful AGENTS.md is present", () => {
    const decision = evaluateProjectCharterGate(input());

    expect(decision.level).toBe("pass");
    expect(decision.canContinue).toBe(true);
    expect(decision.routeTo).toBe("continue");
  });

  it("reports thin guidance as a pass with residual risk", () => {
    const decision = evaluateProjectCharterGate(input({
      charter: {
        fieldAssessments: [
          {
            field: "commands",
            quality: "warn",
            reason: "Heading-only command guidance.",
            evidence: "## Commands"
          }
        ]
      }
    }));

    expect(decision.level).toBe("pass");
    expect(decision.canContinue).toBe(true);
    expect(decision.residualRisk).toContain("commands");
  });

  it("warns but allows read-only sync when AGENTS.md is missing", () => {
    const decision = evaluateProjectCharterGate(input({
      mode: "sync",
      riskLevel: "low",
      mutatesSource: false,
      charter: {
        exists: false,
        sourcePath: null
      }
    }));

    expect(decision.level).toBe("warn");
    expect(decision.canContinue).toBe(true);
    expect(decision.routeTo).toBe("continue");
    expect(decision.missingFields).toContain("purpose");
    expect(decision.missingFields).toContain("repositoryMap");
    expect(decision.missingFields).toContain("commands");
  });

  it("fails implementation when AGENTS.md is missing", () => {
    const decision = evaluateProjectCharterGate(input({
      charter: {
        exists: false,
        sourcePath: null
      }
    }));

    expect(decision.level).toBe("fail");
    expect(decision.canContinue).toBe(false);
    expect(decision.routeTo).toBe("agents-md-builder");
  });

  it("fails implementation when AGENTS.md is placeholder-only", () => {
    const decision = evaluateProjectCharterGate(input({
      charter: {
        placeholderOnly: true
      }
    }));

    expect(decision.level).toBe("fail");
    expect(decision.routeTo).toBe("agents-md-builder");
    expect(decision.reason).toContain("placeholder");
  });

  it("fails implementation when durable guidance is incomplete", () => {
    const decision = evaluateProjectCharterGate(input({
      charter: {
        missingFields: ["nonGoals", "verification"]
      }
    }));

    expect(decision.level).toBe("fail");
    expect(decision.routeTo).toBe("agents-md-builder");
    expect(decision.missingFields).toEqual(["nonGoals", "verification"]);
  });

  it("does not repeat setup prompt on read-only sync after a prior decline", () => {
    const decision = evaluateProjectCharterGate(input({
      mode: "sync",
      riskLevel: "low",
      mutatesSource: false,
      charter: {
        exists: false,
        sourcePath: null,
        declinedSetup: true,
        declineReason: "User wants exploratory inspection first."
      }
    }));

    expect(decision.level).toBe("warn");
    expect(decision.canContinue).toBe(true);
    expect(decision.reason).toContain("previously declined");
  });

  it("blocks execution-like work after a prior setup decline", () => {
    const decision = evaluateProjectCharterGate(input({
      mode: "drive",
      riskLevel: "medium",
      mutatesSource: true,
      charter: {
        exists: false,
        sourcePath: null,
        declinedSetup: true,
        declineReason: "Not now."
      }
    }));

    expect(decision.level).toBe("fail");
    expect(decision.canContinue).toBe(false);
    expect(decision.routeTo).toBe("agents-md-builder");
    expect(decision.reason).toContain("previously declined");
  });

  it("allows explicit bypass only for low-risk read-only work", () => {
    const decision = evaluateProjectCharterGate(input({
      mode: "sync",
      riskLevel: "low",
      mutatesSource: false,
      userExplicitlyBypassed: true,
      charter: {
        exists: false,
        sourcePath: null
      }
    }));

    expect(decision.level).toBe("bypassed");
    expect(decision.canContinue).toBe(true);
    expect(decision.residualRisk).toContain("not confirmed");
  });

  it("does not allow bypass for source mutations", () => {
    const decision = evaluateProjectCharterGate(input({
      userExplicitlyBypassed: true,
      riskLevel: "low",
      mutatesSource: true,
      charter: {
        exists: false,
        sourcePath: null
      }
    }));

    expect(decision.level).toBe("fail");
    expect(decision.canContinue).toBe(false);
  });

  it("routes AGENTS.md and .threadsmith contradictions to hygiene", () => {
    const decision = evaluateProjectCharterGate(input({
      charter: {
        contradictsThreadsmithTruth: true
      }
    }));

    expect(decision.level).toBe("fail");
    expect(decision.routeTo).toBe("hygiene");
    expect(decision.reason).toContain("contradicts");
  });
});
