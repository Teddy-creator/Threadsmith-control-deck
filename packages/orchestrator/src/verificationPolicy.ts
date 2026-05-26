import type {
  AcceptanceState,
  CurrentPhase,
  VerificationLevel,
  VerificationPolicyDecision
} from "@threadsmith/domain";

const RELEASE_COMMAND_PATTERNS = [
  "verify:release",
  "test:e2e",
  "build",
  "launchers"
];

const RELEASE_FILE_PATTERNS = [
  /^README\.md$/i,
  /^CHANGELOG\.md$/i,
  /^\.github\/workflows\//,
  /(^|\/)package(-lock)?\.json$/,
  /(^|\/)release/i,
  /(^|\/)launcher/i,
  /\.command$/i,
  /\.bat$/i,
  /\.ps1$/i
];

const STANDARD_FILE_PATTERNS = [
  /^packages\//,
  /^scripts\//,
  /^codex\/skills\/threadsmith\//,
  /^AGENTS\.md$/i,
  /^\.threadsmith\/(current-phase|acceptance-state|project-status|project-brief|project-supervision)\.json$/
];

const STANDARD_PHASE_KEYWORDS = [
  "runtime",
  "orchestrator",
  "fs-bridge",
  "domain",
  "schema",
  "skill contract",
  "cross-agent",
  "state bridge",
  "packet",
  "truth writeback",
  "状态存储",
  "跨 agent",
  "跨agent",
  "写回",
  "协议",
  "结构"
];

const RELEASE_PHASE_KEYWORDS = [
  "release",
  "publish",
  "github release",
  "public",
  "launcher",
  "installer",
  "windows",
  "mac",
  "ci",
  "发布",
  "公开",
  "安装",
  "启动器"
];

const LEVEL_RANK: Record<VerificationLevel, number> = {
  narrow: 0,
  standard: 1,
  release: 2
};

function phaseText(phase: CurrentPhase) {
  return [
    phase.phaseName,
    phase.phaseGoal,
    phase.deliverable,
    phase.stopCondition,
    ...phase.inScope,
    ...phase.outOfScope
  ].join(" ").toLowerCase();
}

function anyIncludes(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern.toLowerCase()));
}

function matchesAnyFile(filePath: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(filePath));
}

function raise(
  current: VerificationLevel,
  next: VerificationLevel
): VerificationLevel {
  return LEVEL_RANK[next] > LEVEL_RANK[current] ? next : current;
}

function requiredChecksForLevel(level: VerificationLevel, commands: string[]) {
  if (commands.length > 0) {
    return commands;
  }

  if (level === "release") {
    return [
      "Run release-facing verification for touched surfaces.",
      "Confirm launch/install/public docs still match current behavior."
    ];
  }

  if (level === "standard") {
    return [
      "Run the relevant workspace/package tests for touched code.",
      "Confirm Threadsmith contract artifacts still parse."
    ];
  }

  return [
    "Inspect the changed artifacts directly.",
    "Run the smallest relevant focused check if one exists."
  ];
}

function summarizeReason(level: VerificationLevel, reasons: string[]) {
  const lead = {
    narrow: "Focused verification is enough for this slice.",
    standard: "Standard verification is required for behavior or state-impacting work.",
    release: "Release verification is required because the slice touches release-facing surfaces."
  } satisfies Record<VerificationLevel, string>;

  return `${lead[level]} ${reasons[0] ?? ""}`.trim();
}

export function decideVerificationPolicy(input: {
  phase: CurrentPhase;
  acceptance: AcceptanceState;
  changedFiles: string[];
  commands: string[];
}): VerificationPolicyDecision {
  let level: VerificationLevel = "narrow";
  const reasons: string[] = [];
  const escalationSignals: string[] = [];
  const commandText = input.commands.join(" ").toLowerCase();
  const text = phaseText(input.phase);

  if (input.commands.length === 0) {
    reasons.push("No declared verification command; start from focused evidence.");
  } else {
    level = raise(level, "standard");
    reasons.push("Current phase declares verification commands.");
  }

  if (anyIncludes(commandText, RELEASE_COMMAND_PATTERNS)) {
    level = raise(level, "release");
    escalationSignals.push("release-command");
    reasons.push("Declared commands include build/e2e/release-facing checks.");
  }

  if (anyIncludes(text, RELEASE_PHASE_KEYWORDS)) {
    level = raise(level, "release");
    escalationSignals.push("release-shaped-phase");
    reasons.push("Current phase is release/public/installer shaped.");
  }

  if (anyIncludes(text, STANDARD_PHASE_KEYWORDS)) {
    level = raise(level, "standard");
    escalationSignals.push("state-or-runtime-phase");
    reasons.push("Current phase touches runtime, schema, packet, or state behavior.");
  }

  const releaseFiles = input.changedFiles.filter((file) =>
    matchesAnyFile(file, RELEASE_FILE_PATTERNS)
  );
  if (releaseFiles.length > 0) {
    level = raise(level, "release");
    escalationSignals.push(`release-files:${releaseFiles.slice(0, 3).join(",")}`);
    reasons.push("Changed files include release-facing docs, launchers, package, or CI surfaces.");
  }

  const standardFiles = input.changedFiles.filter((file) =>
    matchesAnyFile(file, STANDARD_FILE_PATTERNS)
  );
  if (standardFiles.length > 0) {
    level = raise(level, "standard");
    escalationSignals.push(`behavior-files:${standardFiles.slice(0, 3).join(",")}`);
    reasons.push("Changed files include code, scripts, skill contract, or committed truth surfaces.");
  }

  if (
    input.acceptance.reviewStatus === "review-blocked" ||
    input.acceptance.verificationStatus === "failed" ||
    input.acceptance.finalState === "review-blocked" ||
    input.acceptance.finalState === "verification-failed" ||
    input.acceptance.knownGaps.length > 0
  ) {
    level = raise(level, "standard");
    escalationSignals.push("failed-or-blocked-acceptance");
    reasons.push("Acceptance truth contains failed gates, blockers, or known gaps.");
  }

  return {
    recommendedLevel: level,
    reason: summarizeReason(level, reasons),
    reasons: [...new Set(reasons)],
    escalationSignals: [...new Set(escalationSignals)],
    requiredChecks: requiredChecksForLevel(level, input.commands)
  };
}
