import {
  loadProjectState,
  readLatestAgentRuns,
  readRecentEvents
} from "@threadsmith/fs-bridge";
import { buildAndWritePhaseEvidenceBundle } from "./phaseEvidence.ts";
import { latestPhaseRunRefs } from "./rolePacketContextRefs.ts";

export interface RolePacketBuildContext {
  state: Awaited<ReturnType<typeof loadProjectState>>;
  recentEvents: Awaited<ReturnType<typeof readRecentEvents>>;
  latestRuns: Awaited<ReturnType<typeof readLatestAgentRuns>>;
  phaseRefs: Awaited<ReturnType<typeof latestPhaseRunRefs>>;
  evidenceBundle: Awaited<ReturnType<typeof buildAndWritePhaseEvidenceBundle>>;
}

export async function buildRolePacketContext(
  projectRoot: string
): Promise<RolePacketBuildContext> {
  const statePromise = loadProjectState(projectRoot);
  const latestRunsPromise = readLatestAgentRuns(projectRoot, 4);
  const evidenceBundlePromise = Promise.all([
    statePromise,
    latestRunsPromise
  ]).then(([state, latestRuns]) =>
    buildAndWritePhaseEvidenceBundle(projectRoot, new Date().toISOString(), {
      state,
      latestRuns
    })
  );

  const [
    state,
    recentEvents,
    latestRuns,
    phaseRefs,
    evidenceBundle
  ] = await Promise.all([
    statePromise,
    readRecentEvents(projectRoot, 4),
    latestRunsPromise,
    latestPhaseRunRefs(projectRoot),
    evidenceBundlePromise
  ]);

  return {
    state,
    recentEvents,
    latestRuns,
    phaseRefs,
    evidenceBundle
  };
}
