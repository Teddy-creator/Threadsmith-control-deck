import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  STATE_FILES,
  getAdapterPromptPath,
  getCurrentAgentHandoffPath,
  initializeProjectState,
  refreshCrossAgentBridgeSurface,
  writeStateFragment
} from "@threadsmith/fs-bridge";

async function main() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-bridge-refresh-"));

  try {
    await initializeProjectState(projectRoot);
    await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
      phaseName: "Bridge Refresh Smoke v1",
      phaseGoal: "Refresh the cross-agent bridge surface in one command.",
      deliverable: "Handoff and adapter prompts.",
      inScope: ["Regenerate handoff", "Regenerate adapters"],
      outOfScope: ["Run external agents"],
      stopCondition: "Handoff and adapter files exist.",
      verificationForThisPhase: ["npm run smoke:bridge-refresh"],
      activeOwners: ["planner", "executor"],
      blockedBy: []
    });
    await writeStateFragment(projectRoot, STATE_FILES.projectStatus, {
      projectLabel: "Bridge Refresh Smoke",
      currentTrack: "cross-agent bridge refresh",
      overallState: "stable",
      currentFocus: "Refresh handoff and adapters.",
      projectStatusSummary: "Smoke project for bridge refresh.",
      latestAcceptedSlice: null,
      nextPlannedSlice: null,
      currentMilestoneId: null,
      nextMilestoneId: null,
      topRisks: [],
      updatedAt: "2026-05-23T14:18:00.000Z"
    });

    const summary = await refreshCrossAgentBridgeSurface(projectRoot, {
      createdAt: "2026-05-23T14:19:00.000Z"
    });

    const handoff = await readFile(getCurrentAgentHandoffPath(projectRoot), "utf8");
    const codexAdapter = await readFile(
      getAdapterPromptPath(projectRoot, "codex"),
      "utf8"
    );
    const claudeAdapter = await readFile(
      getAdapterPromptPath(projectRoot, "claude"),
      "utf8"
    );
    const genericAdapter = await readFile(
      getAdapterPromptPath(projectRoot, "generic-agent"),
      "utf8"
    );

    if (!handoff.includes("Bridge Refresh Smoke v1")) {
      throw new Error("handoff did not include the current phase.");
    }

    for (const contents of [handoff, codexAdapter, claudeAdapter, genericAdapter]) {
      if (!contents.includes("committed truth updated at: 2026-05-23T14:18:00.000Z")) {
        throw new Error("bridge artifact did not include committed truth freshness.");
      }
    }

    if (summary.adapters.length !== 3) {
      throw new Error("bridge refresh did not generate all adapter prompts.");
    }

    console.log(
      JSON.stringify(
        {
          mode: "isolated",
          projectRoot,
          phaseName: summary.phaseName,
          finalState: summary.finalState,
          committedTruthUpdatedAt: summary.committedTruthUpdatedAt,
          handoff: summary.handoff.relativePath,
          adapters: summary.adapters.map((adapter) => adapter.relativePath)
        },
        null,
        2
      )
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
