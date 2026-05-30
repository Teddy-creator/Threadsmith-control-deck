import { describe, expect, it } from "vitest";
import {
  createPreferences,
  createValueHeartbeatPreference,
  resolveContinuationBehavior,
  resolveGovernanceIntensity,
  resolveOperatorExplanationStyle
} from "./preferences.ts";

describe("resolveContinuationBehavior", () => {
  it("prefers the project default over the global default", () => {
    const resolved = resolveContinuationBehavior(
      "return-current-thread",
      "smart-continuation"
    );

    expect(resolved.continuationBehavior).toBe("return-current-thread");
    expect(resolved.continuationBehaviorSource).toBe("project-default");
  });

  it("falls back to ask every time when no defaults exist", () => {
    const resolved = createPreferences(null, null);

    expect(resolved.resolved.continuationBehavior).toBe("ask-every-time");
    expect(resolved.resolved.continuationBehaviorSource).toBe("fallback");
    expect(resolved.resolvedGovernance?.governanceIntensity).toBe("standard");
    expect(resolved.resolvedGovernance?.governanceIntensitySource).toBe("fallback");
    expect(resolved.resolvedOperatorExplanation?.operatorExplanationStyle).toBe(
      "balanced"
    );
    expect(
      resolved.resolvedOperatorExplanation?.operatorExplanationStyleSource
    ).toBe("fallback");
    expect(resolved.valueHeartbeat?.source).toBe("fallback");
    expect(resolved.valueHeartbeat?.questions[0]).toContain("usable");
  });

  it("resolves governance intensity from project default before AGENTS.md soft defaults", () => {
    const resolved = resolveGovernanceIntensity("light", "audit-heavy");

    expect(resolved.governanceIntensity).toBe("light");
    expect(resolved.governanceIntensitySource).toBe("project-default");
  });

  it("uses AGENTS.md governance intensity only when project preference is absent", () => {
    const resolved = createPreferences(
      "smart-continuation",
      null,
      "ask-every-time",
      null,
      "audit-heavy"
    );

    expect(resolved.resolvedGovernance?.governanceIntensity).toBe("audit-heavy");
    expect(resolved.resolvedGovernance?.governanceIntensitySource).toBe(
      "agents-md-default"
    );
  });

  it("keeps project-specific value heartbeat questions configurable", () => {
    const heartbeat = createValueHeartbeatPreference([
      "Did the project move closer to the intended user experience?"
    ]);

    expect(heartbeat.source).toBe("project-default");
    expect(heartbeat.questions).toEqual([
      "Did the project move closer to the intended user experience?"
    ]);
  });

  it("resolves operator explanation style from project before AGENTS.md and project brief", () => {
    const resolved = resolveOperatorExplanationStyle(
      "teaching",
      "detailed",
      "concise"
    );

    expect(resolved.operatorExplanationStyle).toBe("teaching");
    expect(resolved.operatorExplanationStyleSource).toBe("project-default");
  });

  it("uses AGENTS.md explanation style before project brief defaults", () => {
    const resolved = createPreferences(
      "smart-continuation",
      null,
      "ask-every-time",
      null,
      null,
      null,
      null,
      "teaching",
      "concise"
    );

    expect(resolved.resolvedOperatorExplanation?.operatorExplanationStyle).toBe(
      "teaching"
    );
    expect(
      resolved.resolvedOperatorExplanation?.operatorExplanationStyleSource
    ).toBe("agents-md-default");
  });
});
