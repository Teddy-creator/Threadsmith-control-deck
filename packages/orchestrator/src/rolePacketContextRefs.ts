import type {
  ContextReference,
  PhaseOwner
} from "@threadsmith/domain";
import {
  readLatestAgentRuns,
  readLatestPhaseRun,
  readPhasePause,
  readRecentEvents
} from "@threadsmith/fs-bridge";

const STATE_REF_DEFINITIONS = {
  projectBrief: {
    kind: "state",
    path: ".threadsmith/project-brief.json",
    title: "项目简报"
  },
  projectStatus: {
    kind: "state",
    path: ".threadsmith/project-status.json",
    title: "项目状态"
  },
  currentPhase: {
    kind: "state",
    path: ".threadsmith/current-phase.json",
    title: "当前 phase"
  },
  acceptanceState: {
    kind: "state",
    path: ".threadsmith/acceptance-state.json",
    title: "验收状态"
  },
  activeWork: {
    kind: "state",
    path: ".threadsmith/active-work.json",
    title: "进行中的工作"
  }
} as const satisfies Record<string, ContextReference>;

type StateRefKey = keyof typeof STATE_REF_DEFINITIONS;

function stateRefs(keys: StateRefKey[]): ContextReference[] {
  return keys.map((key) => STATE_REF_DEFINITIONS[key]);
}

function roleStateRefs(role: PhaseOwner): ContextReference[] {
  switch (role) {
    case "planner":
      return stateRefs([
        "projectBrief",
        "projectStatus",
        "currentPhase",
        "acceptanceState"
      ]);
    case "executor":
      return stateRefs(["currentPhase", "acceptanceState", "activeWork"]);
    case "reviewer":
      return stateRefs(["currentPhase", "acceptanceState"]);
    case "verifier":
      return stateRefs(["currentPhase", "acceptanceState"]);
    case "closeout":
      return stateRefs(["projectStatus", "currentPhase", "acceptanceState"]);
    case "hygiene":
      return stateRefs([
        "projectBrief",
        "projectStatus",
        "currentPhase",
        "acceptanceState",
        "activeWork"
      ]);
  }
}

function roadmapRef(): ContextReference {
  return {
    kind: "state",
    path: ".threadsmith/project-roadmap.json",
    title: "项目地图"
  };
}

function eventRefs(
  events: Awaited<ReturnType<typeof readRecentEvents>>
): ContextReference[] {
  return events.slice(0, 2).map((event) => ({
    kind: "event",
    path: ".threadsmith/events.ndjson",
    title: `${event.createdAt} ${event.title}`
  }));
}

export function currentContextPacketRef(): ContextReference {
  return {
    kind: "state",
    path: ".threadsmith/context/current-packet.json",
    title: "current context packet"
  };
}

export function roleContextPacketRef(role: PhaseOwner): ContextReference {
  return {
    kind: "state",
    path: `.threadsmith/context/role-packets/${role}.json`,
    title: `${role} role context packet`
  };
}

function latestRunRefs(
  records: Awaited<ReturnType<typeof readLatestAgentRuns>>,
  options: {
    roles?: PhaseOwner[];
    limit?: number;
  } = {}
): ContextReference[] {
  const roleSet = options.roles ? new Set(options.roles) : null;

  return records
    .filter((record) => !roleSet || roleSet.has(record.role))
    .slice(0, options.limit ?? 2)
    .flatMap((record) => {
      const artifactPath = record.summaryPath ?? record.resultPath;

      if (!artifactPath) {
        return [];
      }

      return [
        {
          kind: "artifact" as const,
          path: artifactPath,
          title: `最近运行：${record.role} / ${record.status}`
        }
      ];
    });
}

function phaseRunRecordPath(phaseRunId: string) {
  return `.threadsmith/phase-runs/${phaseRunId}/phase-run.json`;
}

function phaseRunSlicePath(phaseRunId: string, sliceId: string) {
  return `.threadsmith/phase-runs/${phaseRunId}/slices/${sliceId}.json`;
}

function phaseRunPausePath(phaseRunId: string) {
  return `.threadsmith/phase-runs/${phaseRunId}/pause.json`;
}

export async function latestPhaseRunRefs(
  projectRoot: string
): Promise<ContextReference[]> {
  const latestPhaseRun = await readLatestPhaseRun(projectRoot);

  if (!latestPhaseRun) {
    return [];
  }

  const refs: ContextReference[] = [
    {
      kind: "artifact",
      path: phaseRunRecordPath(latestPhaseRun.phaseRunId),
      title: `最新 phase run / ${latestPhaseRun.status}`
    },
    {
      kind: "artifact",
      path: latestPhaseRun.lockedPhaseSnapshotRef,
      title: "locked phase snapshot"
    }
  ];

  if (latestPhaseRun.currentSliceId) {
    refs.push({
      kind: "artifact",
      path: phaseRunSlicePath(latestPhaseRun.phaseRunId, latestPhaseRun.currentSliceId),
      title: `当前 slice / ${latestPhaseRun.currentSliceId}`
    });
  }

  const latestPause = await readPhasePause(projectRoot, latestPhaseRun.phaseRunId);

  if (latestPause) {
    refs.push({
      kind: "artifact",
      path: phaseRunPausePath(latestPhaseRun.phaseRunId),
      title: `pause / ${latestPause.type}`
    });
  }

  return refs;
}

function roleLatestRunRefs(
  role: PhaseOwner,
  records: Awaited<ReturnType<typeof readLatestAgentRuns>>
): ContextReference[] {
  switch (role) {
    case "planner":
      return latestRunRefs(records, {
        roles: ["closeout", "reviewer", "verifier"],
        limit: 2
      });
    case "executor":
      return latestRunRefs(records, {
        roles: ["planner", "verifier", "reviewer"],
        limit: 2
      });
    case "reviewer":
      return latestRunRefs(records, {
        roles: ["executor", "planner"],
        limit: 2
      });
    case "verifier":
      return latestRunRefs(records, {
        roles: ["reviewer", "executor"],
        limit: 2
      });
    case "closeout":
      return latestRunRefs(records, {
        roles: ["verifier", "reviewer", "executor"],
        limit: 3
      });
    case "hygiene":
      return latestRunRefs(records, { limit: 4 });
  }
}

export function roleContextRefs(input: {
  role: PhaseOwner;
  events: Awaited<ReturnType<typeof readRecentEvents>>;
  phaseRefs: ContextReference[];
  evidenceRefs: ContextReference[];
  latestRuns: Awaited<ReturnType<typeof readLatestAgentRuns>>;
}) {
  const eventLimit = input.role === "hygiene" ? 2 : 1;
  const eventContext = eventRefs(input.events).slice(0, eventLimit);
  const runContext = roleLatestRunRefs(input.role, input.latestRuns);
  const common = [
    ...roleStateRefs(input.role),
    ...eventContext,
    ...input.phaseRefs,
    ...input.evidenceRefs,
    ...runContext
  ];

  if (input.role === "planner" || input.role === "hygiene") {
    return [...common, roadmapRef()];
  }

  return common;
}
