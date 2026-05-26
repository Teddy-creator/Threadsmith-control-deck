import { describe, expect, it } from "vitest";
import type { ProjectState } from "@threadsmith/domain";
import { decidePlannerMode } from "./plannerMode.ts";

function baseState(override: Partial<ProjectState> = {}): ProjectState {
  const state: ProjectState = {
    projectBrief: {
      projectGoal: "Ship Threadsmith workflow",
      currentVersionScope: "Current slice",
      nonGoals: [],
      keyConstraints: [],
      successFrame: "Workflow is clear",
      priorityOrder: [],
      openStrategicQuestions: []
    },
    projectStatus: {
      projectLabel: "Threadsmith",
      currentTrack: "Runtime",
      overallState: "building",
      currentFocus: "Current phase",
      projectStatusSummary: "Project is building.",
      latestAcceptedSlice: null,
      nextPlannedSlice: null,
      topRisks: [],
      updatedAt: null
    },
    projectRoadmap: {
      versionLabel: "v1",
      finalGoal: "Ship",
      milestones: [],
      updatedAt: null
    },
    currentPhase: {
      phaseName: "Runtime implementation",
      phaseGoal: "Implement the approved runtime slice",
      deliverable: "Working runtime behavior",
      inScope: ["runtime code"],
      outOfScope: [],
      stopCondition: "Runtime slice is verified.",
      verificationForThisPhase: ["npm run test"],
      activeOwners: ["planner", "executor", "reviewer", "verifier", "closeout"],
      blockedBy: []
    },
    acceptanceState: {
      currentClaim: "Runtime slice is in progress.",
      doneWhenChecklist: [],
      implementationStatus: "implementing",
      reviewStatus: "not-started",
      verificationStatus: "not-started",
      closeoutStatus: "not-started",
      knownGaps: [],
      finalState: "not-ready"
    },
    activeWork: {
      items: [],
      blockerSummary: null
    },
    projectSupervision: {
      mode: "multi-thread",
      modeLabel: "多角色协作",
      summary: "Logical role chain.",
      lines: [],
      updatedAt: null
    },
    preferences: {}
  };

  return {
    ...state,
    ...override,
    currentPhase: {
      ...state.currentPhase,
      ...override.currentPhase
    },
    acceptanceState: {
      ...state.acceptanceState,
      ...override.acceptanceState
    }
  };
}

describe("planner mode routing", () => {
  it("keeps planning-shaped phases in planner", () => {
    const decision = decidePlannerMode(baseState({
      currentPhase: {
        phaseName: "Architecture planning",
        phaseGoal: "Write the implementation plan",
        deliverable: "Plan document",
        activeOwners: ["planner"]
      }
    }));

    expect(decision.mode).toBe("planning-phase");
    expect(decision.startRole).toBe("planner");
  });

  it("uses planner-reset when truth contains failed gates", () => {
    const decision = decidePlannerMode(baseState({
      acceptanceState: {
        reviewStatus: "review-blocked",
        finalState: "review-blocked",
        knownGaps: ["Reviewer found scope drift."]
      }
    }));

    expect(decision.mode).toBe("planner-reset");
    expect(decision.startRole).toBe("planner");
  });

  it("starts at reviewer when implementation is already ready for review", () => {
    const decision = decidePlannerMode(baseState({
      acceptanceState: {
        implementationStatus: "ready-for-review",
        finalState: "ready-for-review"
      }
    }));

    expect(decision.mode).toBe("direct-executor");
    expect(decision.startRole).toBe("reviewer");
  });

  it("starts at verifier when review is already complete", () => {
    const decision = decidePlannerMode(baseState({
      acceptanceState: {
        reviewStatus: "ready-for-verification",
        finalState: "ready-for-verification"
      }
    }));

    expect(decision.mode).toBe("direct-executor");
    expect(decision.startRole).toBe("verifier");
  });

  it("uses planner-lite for ordinary implementation phases that still need a slice", () => {
    const decision = decidePlannerMode(baseState());

    expect(decision.mode).toBe("planner-lite");
    expect(decision.startRole).toBe("planner");
  });
});
