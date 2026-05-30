import { describe, expect, it } from "vitest";
import {
  createPreferences,
  resolveContinuationBehavior,
  resolveGovernanceIntensity
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
});
