import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { ProjectState } from "@threadsmith/domain";
import {
  THREADSMITH_DIR,
  getAdapterPromptPath,
  getAdaptersDir
} from "./paths.ts";

export type AgentAdapterName = "codex" | "claude" | "generic-agent";

export interface AgentAdapterPromptSummary {
  adapterName: AgentAdapterName;
  title: string;
  detail: string;
  createdAt: string;
  phaseName: string;
  relativePath: string;
}

export interface AgentAdapterPromptsSummary {
  title: string;
  detail: string;
  createdAt: string;
  phaseName: string;
  adapters: AgentAdapterPromptSummary[];
}

const ADAPTER_NAMES: AgentAdapterName[] = ["codex", "claude", "generic-agent"];

const BASE_READ_ORDER = [
  "AGENTS.md",
  `${THREADSMITH_DIR}/project-brief.json`,
  `${THREADSMITH_DIR}/current-phase.json`,
  `${THREADSMITH_DIR}/acceptance-state.json`,
  `${THREADSMITH_DIR}/project-status.json`,
  `${THREADSMITH_DIR}/active-work.json`,
  `${THREADSMITH_DIR}/project-supervision.json`,
  `${THREADSMITH_DIR}/handoff/current-agent-handoff.md`
];

function formatBulletList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function adapterTitle(adapterName: AgentAdapterName) {
  switch (adapterName) {
    case "codex":
      return "Threadsmith Adapter: Codex";
    case "claude":
      return "Threadsmith Adapter: Claude";
    case "generic-agent":
      return "Threadsmith Adapter: Generic Agent";
  }
}

function adapterIntent(adapterName: AgentAdapterName) {
  switch (adapterName) {
    case "codex":
      return "Use `$threadsmith` as the native supervisor entry when available. Preserve sync / drive / continuous / recover mode boundaries.";
    case "claude":
      return "Operate as a Threadsmith-compatible external agent. Read committed truth first, then return implementation output plus a writeback proposal instead of directly mutating committed truth.";
    case "generic-agent":
      return "Operate as a provider-neutral agent that can read files and follow text instructions. Treat Threadsmith state as the coordination ledger.";
  }
}

function adapterModeInstructions(adapterName: AgentAdapterName) {
  if (adapterName === "codex") {
    return [
      "`sync`: read Threadsmith truth and report status without implementation.",
      "`drive`: perform the next narrow role-bound move and write durable truth only at real boundaries.",
      "`continuous`: use the supported Threadsmith autopilot path when the user explicitly asks to keep going.",
      "`recover`: stop normal work when truth, git state, packet freshness, or evidence disagree."
    ];
  }

  return [
    "Read committed truth before planning or coding.",
    "Use current-agent-handoff.md as a compact projection, not as authority.",
    "Perform only the role/action that is safe from current truth.",
    "Return changed files, evidence, residual risk, and a writeback proposal artifact for Threadsmith to review."
  ];
}

function writebackProposalInstructions(adapterName: AgentAdapterName) {
  if (adapterName === "codex") {
    return [
      "Native Codex work should normally use `$threadsmith` for committed truth writeback.",
      "Use a proposal only when acting as an external or delegated worker that should not directly update committed truth."
    ];
  }

  return [
    `Write proposed state changes to ${THREADSMITH_DIR}/proposals/<proposal-id>.json or return JSON with the same shape.`,
    "Required fields: proposalId, createdAt, agent, role, phaseName, summary, proposedTruthUpdates, evidence, residualRisks, recoverIf, status.",
    "status must start as `proposed` or `needs-review`; external agents must not set `accepted`.",
    "proposedTruthUpdates must target `.threadsmith/...` truth files, not source files and not proposal artifacts.",
    "A proposal for final acceptance must include evidence."
  ];
}

function buildAdapterPromptContents(options: {
  adapterName: AgentAdapterName;
  projectRoot: string;
  state: ProjectState;
  createdAt: string;
}) {
  const isCodex = options.adapterName === "codex";

  return `# ${adapterTitle(options.adapterName)}

## Source
- project root: ${options.projectRoot}
- generated at: ${options.createdAt}
- adapter file: ${THREADSMITH_DIR}/adapters/${options.adapterName}.md
- current phase: ${options.state.currentPhase.phaseName}
- acceptance state: ${options.state.acceptanceState.finalState}

## Purpose
${adapterIntent(options.adapterName)}

## Read Order
${formatBulletList(BASE_READ_ORDER)}

If any source file disagrees with another source file, stop and route to recover. Do not continue from chat memory alone.

## How To Operate
${formatBulletList(adapterModeInstructions(options.adapterName))}

## Authority Rules
- Committed truth in ${THREADSMITH_DIR}/project-brief.json, current-phase.json, acceptance-state.json, project-status.json, active-work.json, and project-supervision.json is the source of truth.
- ${THREADSMITH_DIR}/handoff/current-agent-handoff.md is a readable projection. It is not the authority.
- ${THREADSMITH_DIR}/context/* and ${THREADSMITH_DIR}/adapters/* are derived working context, not acceptance evidence.
- Evidence must come from commands, artifacts, tests, review notes, or verifier output.

## Writeback Rules
${
  isCodex
    ? "- Prefer `$threadsmith` for Threadsmith-managed state changes.\n- Write durable `.threadsmith/` state only at real phase, verification, closeout, or handoff boundaries.\n- Do not turn casual discussion into committed truth."
    : "- Default to read-only access for committed `.threadsmith/` truth.\n- Do not directly edit committed truth unless the project explicitly grants that permission in a future opt-in contract.\n- Return a writeback proposal describing intended truth changes, evidence, and residual risk."
}

## Writeback Proposal Contract
${formatBulletList(writebackProposalInstructions(options.adapterName))}

## Recover If
- AGENTS.md and ${THREADSMITH_DIR}/ disagree.
- current-agent-handoff.md is missing, stale, or references a different phase.
- acceptance claims passed verification but evidence is missing.
- git diff conflicts with accepted truth.
- the requested action changes scope, provider ownership, or release status.

## Output Shape
- What you read: source files and freshness notes.
- What you did: files changed or no-change.
- Evidence: commands, artifacts, or explicit missing evidence.
- Proposed Threadsmith writeback: include a writeback proposal artifact path or inline JSON proposal.
`;
}

export async function writeAgentAdapterPrompts(
  projectRoot: string,
  options: {
    state: ProjectState;
    createdAt?: string;
    adapterNames?: AgentAdapterName[];
  }
): Promise<AgentAdapterPromptsSummary> {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const adapterNames = options.adapterNames ?? ADAPTER_NAMES;

  await mkdir(getAdaptersDir(projectRoot), { recursive: true });

  const adapters: AgentAdapterPromptSummary[] = [];

  for (const adapterName of adapterNames) {
    const relativePath = `${THREADSMITH_DIR}/adapters/${adapterName}.md`;

    await writeFile(
      getAdapterPromptPath(projectRoot, adapterName),
      `${buildAdapterPromptContents({
        adapterName,
        projectRoot,
        state: options.state,
        createdAt
      }).trim()}\n`,
      "utf8"
    );

    adapters.push({
      adapterName,
      title: `${adapterTitle(adapterName)} 已生成`,
      detail: `${adapterName} adapter 已从 committed truth 生成，并保持 derived / non-authoritative 边界。`,
      createdAt,
      phaseName: options.state.currentPhase.phaseName,
      relativePath
    });
  }

  return {
    title: "已生成 Threadsmith adapter prompts",
    detail: `已为 phase「${options.state.currentPhase.phaseName}」生成 ${adapters.length} 份 provider-safe adapter prompt。`,
    createdAt,
    phaseName: options.state.currentPhase.phaseName,
    adapters
  };
}

export async function readAgentAdapterPrompt(
  projectRoot: string,
  adapterName: AgentAdapterName
) {
  try {
    return await readFile(getAdapterPromptPath(projectRoot, adapterName), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}
