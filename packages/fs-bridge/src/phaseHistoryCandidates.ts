import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import type { PhaseHistoryEntry } from "@threadsmith/domain";
import { backfillPhaseHistory } from "./phaseHistory.ts";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

function extractHeading(markdown: string, fallback: string) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback;
}

function extractSection(markdown: string, heading: string) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex(
    (line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase()
  );

  if (start < 0) {
    return "";
  }

  const sectionLines = [];

  for (const line of lines.slice(start + 1)) {
    if (line.trim().startsWith("## ")) {
      break;
    }
    sectionLines.push(line);
  }

  return sectionLines.join("\n");
}

function extractSectionList(markdown: string, heading: string) {
  const section = extractSection(markdown, heading);
  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean);
}

function extractSectionParagraph(markdown: string, heading: string) {
  const section = extractSection(markdown, heading);
  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("- "))
    .join(" ")
    .slice(0, 240);
}

function planIdFromPath(relativePath: string) {
  return `phase-history-candidate-${slugify(relativePath.replace(/\.md$/i, ""))}`;
}

export interface PhaseHistoryCandidate {
  entry: PhaseHistoryEntry;
  confidence: "medium";
  rationale: string;
}

export interface GeneratePhaseHistoryCandidatesOptions {
  plansDir?: string;
  outputPath?: string;
}

export async function generatePhaseHistoryBackfillCandidates(
  projectRoot: string,
  options: GeneratePhaseHistoryCandidatesOptions = {}
) {
  const plansDir = options.plansDir ?? join(projectRoot, "docs", "plans");
  const fileNames = (await readdir(plansDir)).filter((fileName) =>
    fileName.endsWith(".md")
  );
  const candidates: PhaseHistoryCandidate[] = [];

  for (const fileName of fileNames.sort()) {
    const absolutePath = join(plansDir, fileName);
    const relativePath = relative(projectRoot, absolutePath);
    const [markdown, fileStat] = await Promise.all([
      readFile(absolutePath, "utf8"),
      stat(absolutePath)
    ]);
    const phaseName = extractHeading(markdown, basename(fileName, ".md"));
    const goal = extractSectionParagraph(markdown, "Goal");
    const scope = extractSectionList(markdown, "Scope");
    const verification = extractSectionList(markdown, "Verification");
    const timestamp = fileStat.mtime.toISOString();

    candidates.push({
      entry: {
        id: planIdFromPath(relativePath),
        phaseName,
        result: "accepted",
        summary:
          goal ||
          `Candidate generated from ${relativePath}; requires operator review before write.`,
        startedAt: null,
        completedAt: timestamp,
        deliverables: scope.length > 0 ? scope.slice(0, 6) : [relativePath],
        verification:
          verification.length > 0
            ? verification
            : ["Evidence review required before write"],
        evidenceRefs: [relativePath],
        nextPhase: null,
        risks: [
          "Generated from a plan document; review evidence before writing to history."
        ],
        source: {
          kind: "manual",
          ref: relativePath
        },
        createdAt: timestamp
      },
      confidence: "medium",
      rationale:
        "Plan document exists in repo evidence, but this generator does not prove the phase was accepted."
    });
  }

  const preview = await backfillPhaseHistory(
    projectRoot,
    candidates.map((candidate) => candidate.entry)
  );
  const report = {
    mode: "dry-run" as const,
    projectRoot,
    plansDir: relative(projectRoot, plansDir),
    generatedCount: candidates.length,
    acceptedCount: preview.acceptedCount,
    skippedCount: preview.skippedCount,
    candidates,
    preview
  };

  if (options.outputPath) {
    await writeFile(
      options.outputPath,
      `${JSON.stringify(candidates.map((candidate) => candidate.entry), null, 2)}\n`,
      "utf8"
    );
  }

  return report;
}
