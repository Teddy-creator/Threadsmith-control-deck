import { loadProjectState, writeAgentAdapterPrompts } from "@threadsmith/fs-bridge";
import { resolve } from "node:path";

const projectRoot = resolve(process.argv[2] ?? process.cwd());

async function main() {
  const state = await loadProjectState(projectRoot);
  const summary = await writeAgentAdapterPrompts(projectRoot, {
    state
  });

  console.log(
    JSON.stringify(
      {
        projectRoot,
        phaseName: summary.phaseName,
        createdAt: summary.createdAt,
        title: summary.title,
        detail: summary.detail,
        adapters: summary.adapters.map((adapter) => ({
          adapterName: adapter.adapterName,
          relativePath: adapter.relativePath,
          phaseName: adapter.phaseName,
          createdAt: adapter.createdAt
        }))
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Threadsmith adapter prompt generation failed");
  console.error(`Project root: ${projectRoot}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
