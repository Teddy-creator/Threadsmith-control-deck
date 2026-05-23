import { loadProjectState, readRecentEvents, writeCurrentAgentHandoff } from "@threadsmith/fs-bridge";
import { resolve } from "node:path";

const projectRoot = resolve(process.argv[2] ?? process.cwd());

async function main() {
  const state = await loadProjectState(projectRoot);
  const recentEvents = await readRecentEvents(projectRoot);
  const summary = await writeCurrentAgentHandoff(projectRoot, {
    state,
    recentEvents
  });

  console.log(
    JSON.stringify(
      {
        projectRoot,
        phaseName: summary.phaseName,
        recommendedRole: summary.recommendedRole,
        relativePath: summary.relativePath,
        createdAt: summary.createdAt,
        title: summary.title,
        detail: summary.detail
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Threadsmith handoff generation failed");
  console.error(`Project root: ${projectRoot}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
