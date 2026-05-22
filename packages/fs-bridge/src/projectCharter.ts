import { access, readFile } from "node:fs/promises";
import { dirname, join, parse, relative, resolve } from "node:path";
import type {
  ProjectCharterField,
  ProjectCharterFieldAssessment,
  ProjectCharterState
} from "@threadsmith/domain";
import { projectCharterStateSchema } from "@threadsmith/domain";
import { readProjectManifest } from "./projectManifest.ts";
import { readProjectCharterPreferences } from "./projectCharterPreferences.ts";

const REQUIRED_FIELD_PATTERNS: Array<{
  field: ProjectCharterField;
  patterns: RegExp[];
  labels: string[];
}> = [
  {
    field: "purpose",
    patterns: [/purpose/i, /project goal/i, /goal/i, /目标/, /项目目标/],
    labels: ["purpose", "project goal", "目标"]
  },
  {
    field: "goals",
    patterns: [/goals?/i, /priority/i, /目标/, /优先级/],
    labels: ["goal", "priority", "目标"]
  },
  {
    field: "nonGoals",
    patterns: [/non[-\s]?goals?/i, /out of scope/i, /非目标/, /不做/],
    labels: ["non-goal", "out of scope", "非目标"]
  },
  {
    field: "repositoryMap",
    patterns: [/repo(?:sitory)? map/i, /project structure/i, /目录/, /仓库结构/],
    labels: ["repository map", "project structure", "目录"]
  },
  {
    field: "commands",
    patterns: [/commands?/i, /scripts?/i, /npm run/i, /pnpm/i, /yarn/i, /bun/i, /命令/],
    labels: ["command", "npm run", "test", "build", "命令"]
  },
  {
    field: "architectureBoundaries",
    patterns: [/architecture/i, /boundar/i, /架构/, /边界/],
    labels: ["architecture", "boundary", "架构", "边界"]
  },
  {
    field: "riskRules",
    patterns: [/risk/i, /permission/i, /safety/i, /风险/, /权限/],
    labels: ["risk", "permission", "safety", "风险"]
  },
  {
    field: "humanConfirmationGates",
    patterns: [/confirm/i, /approval/i, /ask/i, /确认/, /批准/],
    labels: ["confirm", "approval", "ask", "确认"]
  },
  {
    field: "definitionOfDone",
    patterns: [/definition of done/i, /done when/i, /acceptance/i, /完成标准/, /验收/],
    labels: ["definition of done", "done when", "acceptance", "验收"]
  },
  {
    field: "verification",
    patterns: [/verification/i, /verify/i, /test/i, /验证/, /测试/],
    labels: ["verification", "verify", "test", "验证"]
  }
];

async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function parentDirectory(path: string) {
  const parsed = parse(path);
  const parent = dirname(path);
  return parent === path ? parsed.root : parent;
}

function candidateDirectories(projectRoot: string) {
  const directories: string[] = [];
  let current = resolve(projectRoot);
  const root = parse(current).root;

  while (true) {
    directories.push(current);

    if (current === root) {
      break;
    }

    current = parentDirectory(current);
  }

  return directories;
}

function isPlaceholderOnly(contents: string) {
  const compact = contents.trim().toLowerCase();

  if (compact.length < 80) {
    return true;
  }

  return [
    "todo",
    "tbd",
    "placeholder",
    "fill this",
    "coming soon",
    "待补充",
    "占位"
  ].some((marker) => compact.includes(marker));
}

function sentenceForEvidence(contents: string, patterns: RegExp[]) {
  const lines = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.find((line) => patterns.some((pattern) => pattern.test(line))) ?? null;
}

function isThinEvidence(evidence: string | null) {
  if (!evidence) {
    return true;
  }

  const stripped = evidence
    .replace(/^#+\s*/, "")
    .replace(/^[-*]\s*/, "")
    .replace(/[`*_]/g, "")
    .trim();

  return stripped.length < 24 || /^[\w\s/-]+:?$/i.test(stripped);
}

function assessFields(contents: string): ProjectCharterFieldAssessment[] {
  return REQUIRED_FIELD_PATTERNS.map(({ field, patterns, labels }) => {
    const evidence = sentenceForEvidence(contents, patterns);

    if (!evidence) {
      return {
        field,
        quality: "fail",
        reason: `Missing durable guidance for ${labels[0]}.`,
        evidence: null
      };
    }

    if (isThinEvidence(evidence)) {
      return {
        field,
        quality: "warn",
        reason: `Guidance for ${labels[0]} looks thin or heading-only.`,
        evidence
      };
    }

    return {
      field,
      quality: "pass",
      reason: `Found durable guidance for ${labels[0]}.`,
      evidence
    };
  });
}

function failedFields(assessments: ProjectCharterFieldAssessment[]) {
  return assessments
    .filter((assessment) => assessment.quality === "fail")
    .map((assessment) => assessment.field);
}

export async function inspectProjectCharter(
  projectRoot: string
): Promise<ProjectCharterState> {
  let manifest = null;
  const preferences = await readProjectCharterPreferences(projectRoot);

  try {
    manifest = await readProjectManifest(projectRoot);
  } catch {
    manifest = null;
  }

  for (const directory of candidateDirectories(projectRoot)) {
    const candidate = join(directory, "AGENTS.md");

    if (!(await pathExists(candidate))) {
      continue;
    }

    const contents = await readFile(candidate, "utf8");
    const sourcePath = relative(projectRoot, candidate).replace(/\\/g, "/") || "AGENTS.md";
    const placeholderOnly = isPlaceholderOnly(contents);
    const compositeText = [
      contents,
      manifest?.readme ?? "",
      manifest?.packageJson ?? "",
      manifest?.canonicalPlan ?? ""
    ].join("\n\n");
    const fieldAssessments = placeholderOnly ? [] : assessFields(compositeText);

    return projectCharterStateSchema.parse({
      sourcePath,
      exists: true,
      placeholderOnly,
      stale: false,
      missingFields: placeholderOnly ? [] : failedFields(fieldAssessments),
      fieldAssessments,
      contradictsThreadsmithTruth: false,
      declinedSetup: preferences.declinedSetup,
      declineReason: preferences.declineReason
    });
  }

  return projectCharterStateSchema.parse({
    sourcePath: null,
    exists: false,
    placeholderOnly: false,
    stale: false,
    missingFields: [],
    fieldAssessments: [],
    contradictsThreadsmithTruth: false,
    declinedSetup: preferences.declinedSetup,
    declineReason: preferences.declineReason
  });
}
