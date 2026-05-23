import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { PhaseOwner, ProjectState, WorkflowEvent } from "@threadsmith/domain";
import {
  THREADSMITH_DIR,
  getCurrentAgentHandoffPath,
  getHandoffDir
} from "./paths.ts";

export interface CurrentAgentHandoffSummary {
  title: string;
  detail: string;
  createdAt: string;
  phaseName: string;
  recommendedRole: PhaseOwner;
  relativePath: string;
}

const CURRENT_AGENT_HANDOFF_FILE = "current-agent-handoff.md";

const SOURCE_FILES = [
  "AGENTS.md",
  `${THREADSMITH_DIR}/project-brief.json`,
  `${THREADSMITH_DIR}/current-phase.json`,
  `${THREADSMITH_DIR}/acceptance-state.json`,
  `${THREADSMITH_DIR}/project-status.json`,
  `${THREADSMITH_DIR}/active-work.json`,
  `${THREADSMITH_DIR}/project-supervision.json`,
  `${THREADSMITH_DIR}/events.ndjson`
];

function formatBulletList(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- 无";
}

function formatSourceFiles(sourceFiles: string[]) {
  return sourceFiles.map((filePath) => `- ${filePath}`).join("\n");
}

function formatRecentEvents(recentEvents: WorkflowEvent[]) {
  return recentEvents.length > 0
    ? recentEvents
        .slice(0, 5)
        .map((event) => {
          const artifact = event.artifactPath ? ` Artifact：${event.artifactPath}` : "";
          return `- ${event.createdAt}: ${event.title} - ${event.detail}${artifact}`;
        })
        .join("\n")
    : "- 无";
}

function activeBlockers(state: ProjectState) {
  const blockedItems = state.activeWork.items.filter(
    (item) => item.status === "blocked" || item.requiresUserDecision
  );
  const blockers = [
    state.activeWork.blockerSummary,
    ...blockedItems.map((item) => `${item.role}: ${item.taskSummary}`)
  ].filter((item): item is string => Boolean(item?.trim()));

  return blockers.length > 0 ? blockers : ["无"];
}

function lastCompletedStep(state: ProjectState, recentEvents: WorkflowEvent[]) {
  const event = recentEvents.find((candidate) =>
    ["workflow-transition", "deck-action", "agent-run", "phase-run"].includes(
      candidate.kind
    )
  );

  if (event) {
    return `${event.title}（${event.createdAt}）`;
  }

  const doneItem = [...state.activeWork.items]
    .reverse()
    .find((item) => item.status === "done");

  return doneItem ? `${doneItem.role}: ${doneItem.taskSummary}` : "无";
}

function recommendedRole(state: ProjectState): PhaseOwner {
  const running = state.activeWork.items.find((item) => item.status === "running");
  if (running) {
    return running.role;
  }

  const waiting = state.activeWork.items.find((item) => item.status === "waiting");
  if (waiting) {
    return waiting.role;
  }

  if (state.acceptanceState.finalState === "accepted") {
    return "planner";
  }

  if (state.acceptanceState.verificationStatus === "ready") {
    return "verifier";
  }

  if (state.acceptanceState.reviewStatus === "in-review") {
    return "reviewer";
  }

  return "executor";
}

function recommendedAction(state: ProjectState, role: PhaseOwner) {
  const roleWork = state.activeWork.items.find((item) => item.role === role);

  if (roleWork) {
    return roleWork.taskSummary;
  }

  if (state.acceptanceState.finalState === "accepted") {
    return "从 accepted truth 起草下一阶段 phase reset。";
  }

  return "读取 committed truth 后执行当前 phase 的下一步，并在证据不足时停止。";
}

function evidenceLine(recentEvents: WorkflowEvent[]) {
  const eventWithArtifact = recentEvents.find((event) => event.artifactPath);

  if (eventWithArtifact?.artifactPath) {
    return eventWithArtifact.artifactPath;
  }

  return "没有新的 evidence artifact；继续前请优先运行当前 phase 的 verification。";
}

function buildCurrentAgentHandoffContents(options: {
  projectRoot: string;
  state: ProjectState;
  recentEvents: WorkflowEvent[];
  createdAt: string;
  sourceFiles?: string[];
}) {
  const sourceFiles = options.sourceFiles ?? SOURCE_FILES;
  const role = recommendedRole(options.state);
  const action = recommendedAction(options.state, role);

  return `# Threadsmith Agent Handoff

## Source
- project root: ${options.projectRoot}
- generated at: ${options.createdAt}
- generated file: ${THREADSMITH_DIR}/handoff/${CURRENT_AGENT_HANDOFF_FILE}
- source files:
${formatSourceFiles(sourceFiles)}

This handoff is a readable projection derived from committed Threadsmith truth. It is not the authority.

## Project State
- project goal: ${options.state.projectBrief.projectGoal}
- current phase: ${options.state.currentPhase.phaseName}
- acceptance state: ${options.state.acceptanceState.finalState}
- current claim: ${options.state.acceptanceState.currentClaim}
- active blockers:
${formatBulletList(activeBlockers(options.state))}

## What Just Happened
- last completed step: ${lastCompletedStep(options.state, options.recentEvents)}
- changed files or artifacts: ${evidenceLine(options.recentEvents)}
- evidence:
${formatRecentEvents(options.recentEvents)}

## Next Safe Move
- recommended role: ${role}
- action: ${action}
- success criteria:
${formatBulletList(options.state.acceptanceState.doneWhenChecklist.map((item) => `${item.id}: ${item.label} (${item.status})`))}
- stop condition: ${options.state.currentPhase.stopCondition}

## Architecture And Risk Boundaries
- relevant AGENTS.md rules: committed truth in ${THREADSMITH_DIR}/ is durable project state; do not write ordinary discussion into truth; run narrow verification before completion claims.
- affected layer: derived handoff packet over committed truth, not source-of-truth state.
- confirmation gates:
${formatBulletList(options.state.currentPhase.blockedBy)}

## Writeback Rules
- this agent may write: source/docs/tests for the current phase, plus writeback proposals when acting as an external or unknown agent.
- this agent must only propose: committed truth updates, final acceptance, verification pass claims, or scope changes unless routed through Threadsmith gates.
- route to recover if: AGENTS.md and ${THREADSMITH_DIR}/ disagree; packet freshness cannot be proven; evidence is missing; git diff conflicts with accepted truth; or the requested action changes scope.
`;
}

export async function writeCurrentAgentHandoff(
  projectRoot: string,
  options: {
    state: ProjectState;
    recentEvents: WorkflowEvent[];
    createdAt?: string;
    sourceFiles?: string[];
  }
): Promise<CurrentAgentHandoffSummary> {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const relativePath = `${THREADSMITH_DIR}/handoff/${CURRENT_AGENT_HANDOFF_FILE}`;
  const role = recommendedRole(options.state);

  await mkdir(getHandoffDir(projectRoot), { recursive: true });
  await writeFile(
    getCurrentAgentHandoffPath(projectRoot),
    `${buildCurrentAgentHandoffContents({
      projectRoot,
      state: options.state,
      recentEvents: options.recentEvents,
      createdAt,
      sourceFiles: options.sourceFiles
    }).trim()}\n`,
    "utf8"
  );

  return {
    title: "已刷新 current-agent-handoff",
    detail: `已把 phase「${options.state.currentPhase.phaseName}」投影到固定 handoff 文件，外部 agent 可从该文件读取下一步安全动作。`,
    createdAt,
    phaseName: options.state.currentPhase.phaseName,
    recommendedRole: role,
    relativePath
  };
}

export async function readCurrentAgentHandoff(projectRoot: string) {
  try {
    return await readFile(getCurrentAgentHandoffPath(projectRoot), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}
