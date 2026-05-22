import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, relative } from "node:path";

const ignoredNames = new Set([".DS_Store"]);

function defaultInstalledSkillDir() {
  const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
  return join(codexHome, "skills", "threadsmith");
}

const repoSkillDir =
  process.env.THREADSMITH_REPO_SKILL_DIR || join("codex", "skills", "threadsmith");
const installedSkillDir =
  process.env.THREADSMITH_INSTALLED_SKILL_DIR || defaultInstalledSkillDir();

async function listFiles(root) {
  const files = [];

  async function visit(dir) {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (ignoredNames.has(entry.name)) {
        continue;
      }

      const absolutePath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        files.push(relative(root, absolutePath).replaceAll("\\", "/"));
      }
    }
  }

  await visit(root);
  return files.sort();
}

async function digestFile(path) {
  const contents = await readFile(path);
  return createHash("sha256").update(contents).digest("hex");
}

async function assertDirectory(path, label) {
  if (!existsSync(path)) {
    throw new Error(`${label} does not exist: ${path}`);
  }

  const info = await stat(path);
  if (!info.isDirectory()) {
    throw new Error(`${label} is not a directory: ${path}`);
  }
}

async function main() {
  await assertDirectory(repoSkillDir, "Repository skill directory");
  await assertDirectory(installedSkillDir, "Installed skill directory");

  const repoFiles = await listFiles(repoSkillDir);
  const installedFiles = await listFiles(installedSkillDir);
  const allFiles = [...new Set([...repoFiles, ...installedFiles])].sort();

  const missingInstalled = [];
  const extraInstalled = [];
  const changed = [];

  for (const file of allFiles) {
    const inRepo = repoFiles.includes(file);
    const inInstalled = installedFiles.includes(file);

    if (!inInstalled) {
      missingInstalled.push(file);
      continue;
    }

    if (!inRepo) {
      extraInstalled.push(file);
      continue;
    }

    const repoDigest = await digestFile(join(repoSkillDir, file));
    const installedDigest = await digestFile(join(installedSkillDir, file));
    if (repoDigest !== installedDigest) {
      changed.push(file);
    }
  }

  const hasDrift =
    missingInstalled.length > 0 ||
    extraInstalled.length > 0 ||
    changed.length > 0;

  console.log("Threadsmith skill sync check");
  console.log(`Repository skill: ${repoSkillDir}`);
  console.log(`Installed skill:  ${installedSkillDir}`);

  if (!hasDrift) {
    console.log("Result: in sync");
    process.exit(0);
  }

  console.log("Result: drift detected");

  if (missingInstalled.length > 0) {
    console.log("");
    console.log("Missing from installed skill:");
    for (const file of missingInstalled) {
      console.log(`- ${file}`);
    }
  }

  if (extraInstalled.length > 0) {
    console.log("");
    console.log("Extra in installed skill:");
    for (const file of extraInstalled) {
      console.log(`- ${file}`);
    }
  }

  if (changed.length > 0) {
    console.log("");
    console.log("Changed files:");
    for (const file of changed) {
      console.log(`- ${file}`);
    }
  }

  console.log("");
  console.log("This command is read-only. Sync/install the global skill only when explicitly intended.");
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
