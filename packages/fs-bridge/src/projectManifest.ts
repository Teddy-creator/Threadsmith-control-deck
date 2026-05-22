import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function readOptionalText(path: string) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function readProjectManifest(projectRoot: string) {
  const [readme, packageJson, canonicalPlan] = await Promise.all([
    readOptionalText(join(projectRoot, "README.md")),
    readOptionalText(join(projectRoot, "package.json")),
    readOptionalText(join(projectRoot, "docs", "plans", "canonical-workflow-repair-v1.md"))
  ]);

  return {
    readme,
    packageJson,
    canonicalPlan
  };
}
