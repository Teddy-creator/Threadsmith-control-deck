import type { AgentAdapterName } from "./agentAdapters.ts";
import {
  type AgentAdapterPromptsSummary,
  writeAgentAdapterPrompts
} from "./agentAdapters.ts";
import {
  type CurrentAgentHandoffSummary,
  writeCurrentAgentHandoff
} from "./agentHandoff.ts";
import { loadProjectState } from "./fileStore.ts";
import { readRecentEvents } from "./events.ts";

export interface BridgeRefreshSummary {
  title: string;
  detail: string;
  projectRoot: string;
  phaseName: string;
  finalState: string;
  committedTruthUpdatedAt: string | null;
  handoff: CurrentAgentHandoffSummary;
  adapters: AgentAdapterPromptsSummary["adapters"];
  createdAt: string;
}

export async function refreshCrossAgentBridgeSurface(
  projectRoot: string,
  options: {
    createdAt?: string;
    adapterNames?: AgentAdapterName[];
  } = {}
): Promise<BridgeRefreshSummary> {
  const state = await loadProjectState(projectRoot);
  const recentEvents = await readRecentEvents(projectRoot);
  const createdAt = options.createdAt ?? new Date().toISOString();

  const handoff = await writeCurrentAgentHandoff(projectRoot, {
    state,
    recentEvents,
    createdAt
  });
  const adapterSummary = await writeAgentAdapterPrompts(projectRoot, {
    state,
    createdAt,
    adapterNames: options.adapterNames
  });

  return {
    title: "已刷新 Cross-Agent State Bridge",
    detail:
      "已验证 committed truth 可读取，并刷新 current-agent-handoff 与 provider adapter prompts。",
    projectRoot,
    phaseName: state.currentPhase.phaseName,
    finalState: state.acceptanceState.finalState,
    committedTruthUpdatedAt: state.projectStatus.updatedAt ?? null,
    handoff,
    adapters: adapterSummary.adapters,
    createdAt
  };
}
