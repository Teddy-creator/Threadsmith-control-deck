import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  ContextReference,
  PhaseRunEvidenceBundle,
  PhaseRunRecord
} from "@threadsmith/domain";
import {
  loadProjectState,
  readLatestAgentRuns,
  readLatestPhaseRun,
  writePhaseRunEvidenceBundle
} from "@threadsmith/fs-bridge";
import { decideVerificationPolicy } from "./verificationPolicy.ts";

const execFileAsync = promisify(execFile);

function phaseRunEvidenceBundlePath(phaseRunId: string) {
  return `.threadsmith/phase-runs/${phaseRunId}/evidence-bundle.json`;
}

function parseChangedFiles(stdout: string) {
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^..?\s+/, "").trim())
    .filter(Boolean);
}

async function readGitSummary(projectRoot: string) {
  const command = "git status --short";

  try {
    const { stdout } = await execFileAsync("git", ["-C", projectRoot, "status", "--short"]);
    const changedFiles = parseChangedFiles(stdout);

    return {
      status: changedFiles.length > 0 ? "dirty" as const : "clean" as const,
      changedFiles,
      summary:
        changedFiles.length > 0
          ? `${changedFiles.length} changed file(s) detected.`
          : "Working tree is clean.",
      command
    };
  } catch (error) {
    return {
      status: "unknown" as const,
      changedFiles: [],
      summary: `Unable to read git status: ${(error as Error).message}`,
      command
    };
  }
}

function staleTruthWarnings(phaseRun: PhaseRunRecord, activeOwners: string[]) {
  const warnings: string[] = [];

  if (phaseRun.currentRole && !activeOwners.includes(phaseRun.currentRole)) {
    warnings.push(
      `Current role ${phaseRun.currentRole} is not listed in current phase active owners.`
    );
  }

  if (phaseRun.status === "paused" && !phaseRun.pauseReason) {
    warnings.push("Phase run is paused but has no pause reason.");
  }

  if (phaseRun.status === "accepted" && !phaseRun.finishedAt) {
    warnings.push("Phase run is accepted but has no finishedAt timestamp.");
  }

  return warnings;
}

export async function buildAndWritePhaseEvidenceBundle(
  projectRoot: string,
  generatedAt = new Date().toISOString()
): Promise<{ bundle: PhaseRunEvidenceBundle; ref: ContextReference } | null> {
  const phaseRun = await readLatestPhaseRun(projectRoot);

  if (!phaseRun) {
    return null;
  }

  const state = await loadProjectState(projectRoot);
  const latestRuns = await readLatestAgentRuns(projectRoot, 4);
  const git = await readGitSummary(projectRoot);
  const verification = decideVerificationPolicy({
    phase: state.currentPhase,
    acceptance: state.acceptanceState,
    changedFiles: git.changedFiles,
    commands: state.currentPhase.verificationForThisPhase
  });
  const bundle: PhaseRunEvidenceBundle = {
    phaseRunId: phaseRun.phaseRunId,
    generatedAt,
    git,
    phaseRun: {
      status: phaseRun.status,
      currentRole: phaseRun.currentRole,
      currentSliceId: phaseRun.currentSliceId,
      latestRunRef: phaseRun.latestRunRef,
      pauseReason: phaseRun.pauseReason
    },
    acceptance: {
      claim: state.acceptanceState.currentClaim,
      finalState: state.acceptanceState.finalState,
      knownGaps: state.acceptanceState.knownGaps,
      checklist: state.acceptanceState.doneWhenChecklist.map((item) => ({
        id: item.id,
        label: item.label,
        status: item.status
      }))
    },
    verification: {
      commands: state.currentPhase.verificationForThisPhase,
      ...verification
    },
    latestRuns: latestRuns.map((run) => ({
      runId: run.runId,
      role: run.role,
      status: run.status,
      outcome: run.outcome,
      resultPath: run.resultPath,
      summaryPath: run.summaryPath
    })),
    staleTruthWarnings: staleTruthWarnings(
      phaseRun,
      state.currentPhase.activeOwners
    )
  };

  const parsed = await writePhaseRunEvidenceBundle(
    projectRoot,
    phaseRun.phaseRunId,
    bundle
  );

  return {
    bundle: parsed,
    ref: {
      kind: "artifact",
      path: phaseRunEvidenceBundlePath(phaseRun.phaseRunId),
      title: `phase evidence bundle / ${parsed.verification.recommendedLevel}`
    }
  };
}
