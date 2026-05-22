import { describe, expect, it } from "vitest";
import {
  projectCharterGateDecisionSchema,
  projectCharterGateInputSchema,
  projectCharterStateSchema
} from "./projectCharterGate.ts";

describe("projectCharterStateSchema", () => {
  it("parses a missing charter with safe defaults", () => {
    const parsed = projectCharterStateSchema.parse({});

    expect(parsed.exists).toBe(false);
    expect(parsed.sourcePath).toBeNull();
    expect(parsed.missingFields).toEqual([]);
    expect(parsed.declinedSetup).toBe(false);
  });
});

describe("projectCharterGateInputSchema", () => {
  it("defaults mode risk details without assuming a bypass", () => {
    const parsed = projectCharterGateInputSchema.parse({
      mode: "sync",
      charter: {
        exists: true,
        sourcePath: "AGENTS.md"
      }
    });

    expect(parsed.riskLevel).toBe("medium");
    expect(parsed.mutatesSource).toBe(false);
    expect(parsed.userExplicitlyBypassed).toBe(false);
  });
});

describe("projectCharterGateDecisionSchema", () => {
  it("keeps a typed gate result for downstream skill and deck surfaces", () => {
    const parsed = projectCharterGateDecisionSchema.parse({
      level: "warn",
      canContinue: true,
      routeTo: "continue",
      reason: "Read-only sync may continue with missing charter guidance.",
      missingFields: ["purpose"],
      residualRisk: "Implementation must not start before charter repair."
    });

    expect(parsed.level).toBe("warn");
    expect(parsed.missingFields).toEqual(["purpose"]);
  });
});
