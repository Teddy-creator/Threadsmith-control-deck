import { describe, expect, it } from "vitest";
import {
  artifactsForLayer,
  defaultStateBoundaryContract,
  defaultWriteModeForAgent,
  roleRuleFor,
  stateBoundaryContractSchema
} from "./stateBoundary.ts";

describe("stateBoundaryContractSchema", () => {
  it("parses the default Threadsmith state boundary contract", () => {
    const parsed = stateBoundaryContractSchema.parse(defaultStateBoundaryContract);

    expect(parsed.version).toBe(1);
    expect(artifactsForLayer(parsed, "committed-truth").map((item) => item.path)).toContain(
      ".threadsmith/current-phase.json"
    );
    expect(artifactsForLayer(parsed, "derived-packet").map((item) => item.path)).toContain(
      ".threadsmith/handoff/current-agent-handoff.md"
    );
  });

  it("rejects committed truth that is not authoritative", () => {
    expect(() =>
      stateBoundaryContractSchema.parse({
        ...defaultStateBoundaryContract,
        artifacts: [
          {
            ...defaultStateBoundaryContract.artifacts[1]!,
            authority: "derived"
          }
        ]
      })
    ).toThrow(/committed truth artifacts must be authoritative/);
  });

  it("rejects derived packets that pretend to be authoritative", () => {
    expect(() =>
      stateBoundaryContractSchema.parse({
        ...defaultStateBoundaryContract,
        artifacts: [
          {
            ...defaultStateBoundaryContract.artifacts.find(
              (artifact) => artifact.path === ".threadsmith/context/current-packet.json"
            )!,
            authority: "authoritative"
          }
        ]
      })
    ).toThrow(/derived packet artifacts must be derived/);
  });

  it("keeps verifier and closeout behind evidence gates", () => {
    const verifier = roleRuleFor(defaultStateBoundaryContract, "verifier");
    const closeout = roleRuleFor(defaultStateBoundaryContract, "closeout");

    expect(verifier.evidenceRequiredForAcceptance).toBe(true);
    expect(verifier.mustNotWrite).toContain(
      ".threadsmith/acceptance-state.json#finalState=accepted"
    );
    expect(closeout.evidenceRequiredForAcceptance).toBe(true);
    expect(closeout.mustNotWrite).toContain("new implementation scope");
  });

  it("defaults external agents to proposal writes for committed truth", () => {
    const currentPhase = defaultStateBoundaryContract.artifacts.find(
      (artifact) => artifact.path === ".threadsmith/current-phase.json"
    )!;
    const handoff = defaultStateBoundaryContract.artifacts.find(
      (artifact) => artifact.path === ".threadsmith/handoff/current-agent-handoff.md"
    )!;

    expect(
      defaultWriteModeForAgent({
        artifact: currentPhase,
        agentKind: "external-unknown"
      })
    ).toBe("proposal");
    expect(
      defaultWriteModeForAgent({
        artifact: handoff,
        agentKind: "external-known"
      })
    ).toBe("proposal");
  });

  it("treats writeback proposals as runtime artifacts, not committed truth", () => {
    const proposal = defaultStateBoundaryContract.artifacts.find(
      (artifact) => artifact.path === ".threadsmith/proposals/<proposal-id>.json"
    )!;

    expect(proposal.layer).toBe("runtime-artifact");
    expect(proposal.authority).toBe("runtime");
    expect(proposal.defaultWriteMode).toBe("proposal");
    expect(proposal.description).toContain("never accepted committed truth");
  });

  it("allows native Threadsmith workflow to use direct writes where the contract allows it", () => {
    const currentPhase = defaultStateBoundaryContract.artifacts.find(
      (artifact) => artifact.path === ".threadsmith/current-phase.json"
    )!;

    expect(
      defaultWriteModeForAgent({
        artifact: currentPhase,
        agentKind: "threadsmith-native"
      })
    ).toBe("direct");
  });
});
