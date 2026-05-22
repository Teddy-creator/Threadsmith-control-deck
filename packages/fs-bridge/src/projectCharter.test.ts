import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectProjectCharter } from "./projectCharter.ts";
import {
  clearProjectCharterDecline,
  readProjectCharterPreferences,
  recordProjectCharterDecline
} from "./projectCharterPreferences.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-charter-"));
  createdRoots.push(projectRoot);
  return projectRoot;
}

async function writeUsefulAgents(projectRoot: string) {
  await writeFile(
    join(projectRoot, "AGENTS.md"),
    [
      "# Project Constitution",
      "",
      "## Purpose",
      "Keep the project charter scanner honest.",
      "",
      "## Goals And Non-Goals",
      "Goal: detect durable guidance. Non-goals: broad unrelated behavior.",
      "",
      "## Repository Map And Commands",
      "Source lives in packages and tests. Commands: npm test and npm run build.",
      "",
      "## Architecture Boundaries And Risk Rules",
      "Keep scanning separate from execution. Ask before destructive changes.",
      "",
      "## Human Confirmation Gates",
      "Confirm before publishing, destructive git, or scope expansion.",
      "",
      "## Definition Of Done And Verification",
      "Done when tests pass and evidence is reported."
    ].join("\n"),
    "utf8"
  );
}

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((projectRoot) =>
      rm(projectRoot, { recursive: true, force: true })
    )
  );
});

describe("inspectProjectCharter", () => {
  it("returns missing state when no AGENTS.md is available", async () => {
    const projectRoot = await createProjectRoot();

    const charter = await inspectProjectCharter(projectRoot);

    expect(charter.exists).toBe(false);
    expect(charter.sourcePath).toBeNull();
  });

  it("uses the nearest AGENTS.md for nested project paths", async () => {
    const projectRoot = await createProjectRoot();
    await writeUsefulAgents(projectRoot);
    await mkdir(join(projectRoot, "packages", "app"), { recursive: true });

    const charter = await inspectProjectCharter(join(projectRoot, "packages", "app"));

    expect(charter.exists).toBe(true);
    expect(charter.sourcePath).toBe("../../AGENTS.md");
    expect(charter.missingFields).toEqual([]);
    expect(charter.fieldAssessments.every((item) => item.quality !== "fail")).toBe(true);
  });

  it("marks placeholder charters before trusting repo signals", async () => {
    const projectRoot = await createProjectRoot();
    await writeFile(join(projectRoot, "AGENTS.md"), "TODO: fill this later\n", "utf8");
    await writeFile(
      join(projectRoot, "README.md"),
      "Purpose. Non-goals. Repository Map. Commands. Architecture. Risk. Confirm. Done when. Verification.\n",
      "utf8"
    );

    const charter = await inspectProjectCharter(projectRoot);

    expect(charter.exists).toBe(true);
    expect(charter.placeholderOnly).toBe(true);
  });

  it("keeps field-level quality warnings for thin AGENTS.md sections", async () => {
    const projectRoot = await createProjectRoot();
    await writeFile(
      join(projectRoot, "AGENTS.md"),
      [
        "# Project Constitution",
        "",
        "## Purpose",
        "This project verifies field-level quality warnings in Threadsmith.",
        "",
        "## Goals",
        "Ship reliable project charter gates.",
        "",
        "## Non-Goals",
        "Do not rewrite unrelated surfaces.",
        "",
        "## Repository Map",
        "Packages and tests contain the implementation.",
        "",
        "## Commands",
        "",
        "## Architecture Boundaries",
        "Keep fs scanning separate from runtime gate decisions.",
        "",
        "## Risk Rules",
        "Ask before destructive changes.",
        "",
        "## Human Confirmation Gates",
        "Confirm before publishing.",
        "",
        "## Definition Of Done",
        "Done when focused tests pass.",
        "",
        "## Verification",
        "Run focused tests before completion."
      ].join("\n"),
      "utf8"
    );

    const charter = await inspectProjectCharter(projectRoot);

    expect(charter.missingFields).toEqual([]);
    expect(
      charter.fieldAssessments.find((item) => item.field === "commands")?.quality
    ).toBe("warn");
  });

  it("surfaces persisted setup decline memory with missing charters", async () => {
    const projectRoot = await createProjectRoot();
    await recordProjectCharterDecline(
      projectRoot,
      "User wants to inspect the repo before creating AGENTS.md.",
      "2026-05-22T12:00:00.000Z"
    );

    const preferences = await readProjectCharterPreferences(projectRoot);
    const charter = await inspectProjectCharter(projectRoot);

    expect(preferences.declinedSetup).toBe(true);
    expect(preferences.declinedAt).toBe("2026-05-22T12:00:00.000Z");
    expect(charter.exists).toBe(false);
    expect(charter.declinedSetup).toBe(true);
    expect(charter.declineReason).toContain("inspect");

    await clearProjectCharterDecline(projectRoot);
    await expect(readProjectCharterPreferences(projectRoot)).resolves.toEqual({
      declinedSetup: false,
      declineReason: null,
      declinedAt: null
    });
  });
});
