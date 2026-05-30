import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProjectState } from "@threadsmith/domain";
import type { AdaptiveWorkSessionSignals } from "./nextBestStep.ts";
import { selectNextBestStep } from "./nextBestStep.ts";

interface Fixture {
  id: string;
  description: string;
  signals?: AdaptiveWorkSessionSignals;
  expected: {
    actionId: string;
    operatingMode: string;
    writebackTier: string;
    verificationLevel: string;
    outputBudget: string;
    nextStepKind?: string;
  };
  capabilityMustContain: string;
}

const baseState: ProjectState = {
  projectBrief: {
    projectGoal: "Ship Threadsmith",
    currentVersionScope: "Human-centered governance",
    nonGoals: [],
    keyConstraints: [],
    successFrame: "Threadsmith feels lighter without losing safety.",
    priorityOrder: ["Human-centered workflow"],
    openStrategicQuestions: []
  },
  projectStatus: {
    projectLabel: "Threadsmith",
    currentTrack: "Human-centered governance",
    overallState: "in-progress",
    currentFocus: "Make ordinary Threadsmith work less protocol-heavy.",
    projectStatusSummary: "Threadsmith is implementing a lighter collaboration loop.",
    latestAcceptedSlice: null,
    nextPlannedSlice: null,
    topRisks: [],
    updatedAt: null
  },
  projectRoadmap: {
    versionLabel: "Threadsmith v1",
    finalGoal: "Lighter governance",
    milestones: [],
    updatedAt: null
  },
  currentPhase: {
    phaseName: "Human-centered governance",
    phaseGoal: "Add mode and output metadata.",
    deliverable: "Runtime recommendation metadata",
    inScope: ["nextBestStep metadata"],
    outOfScope: ["frontend redesign"],
    stopCondition: "Recommendations carry human-centered metadata.",
    verificationForThisPhase: ["runtime tests"],
    activeOwners: ["planner", "executor", "reviewer"],
    blockedBy: []
  },
  acceptanceState: {
    currentClaim: "Runtime can recommend the next human-centered action.",
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
  preferences: {
    projectDefault: "smart-continuation",
    globalDefault: null,
    resolved: {
      continuationBehavior: "smart-continuation",
      continuationBehaviorSource: "project-default"
    }
  }
};

const fixturesDir = join(
  process.cwd(),
  "fixtures",
  "human-centered-output"
);

function loadFixtures() {
  return readdirSync(fixturesDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) =>
      JSON.parse(readFileSync(join(fixturesDir, file), "utf8")) as Fixture
    );
}

describe("human-centered output fixtures", () => {
  it.each(loadFixtures())("$id: $description", (fixture) => {
    const result = selectNextBestStep(
      baseState,
      undefined,
      null,
      undefined,
      undefined,
      null,
      fixture.signals ?? {}
    );

    expect(result.primary).toMatchObject(fixture.expected);
    expect(result.primary.capabilityTranslation).toContain(
      fixture.capabilityMustContain
    );
    expect(result.primary.label.toLowerCase()).not.toBe("phase");
    expect(result.primary.capabilityTranslation?.trim()).not.toBe("");
  });
});
