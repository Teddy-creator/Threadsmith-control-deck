import type {
  PhaseOwner,
  SkillCapability,
  SkillOrchestratorConfig
} from "@threadsmith/domain";

export function builtInOnlyOrchestratorConfig(): SkillOrchestratorConfig {
  return {
    version: 1,
    builtInProtocols: [
      "brief",
      "plan",
      "debug",
      "review",
      "verify",
      "closeout",
      "handoff",
      "recover",
      "research"
    ],
    adapters: [],
    routePreferences: [],
    defaultFallback: "plan",
    selfHosting: {
      activeController: "installed-skill",
      repositorySkillPath: "codex/skills/threadsmith/SKILL.md",
      installedSkillPath: "~/.codex/skills/threadsmith/SKILL.md",
      allowGlobalSkillMutation: false
    }
  };
}

export function protocolCapabilityForRole(role: PhaseOwner): SkillCapability {
  switch (role) {
    case "planner":
    case "executor":
      return "plan";
    case "reviewer":
      return "review";
    case "verifier":
      return "verify";
    case "closeout":
      return "closeout";
    case "hygiene":
      return "recover";
  }
}
