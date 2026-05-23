import { refreshCrossAgentBridgeSurface } from "@threadsmith/fs-bridge";
import { resolve } from "node:path";

const projectRoot = resolve(process.argv[2] ?? process.cwd());

async function main() {
  const summary = await refreshCrossAgentBridgeSurface(projectRoot);

  console.log(
    JSON.stringify(
      {
        projectRoot: summary.projectRoot,
        phaseName: summary.phaseName,
        finalState: summary.finalState,
        committedTruthUpdatedAt: summary.committedTruthUpdatedAt,
        title: summary.title,
        detail: summary.detail,
        createdAt: summary.createdAt,
        handoff: {
          relativePath: summary.handoff.relativePath,
          recommendedRole: summary.handoff.recommendedRole,
          createdAt: summary.handoff.createdAt
        },
        adapters: summary.adapters.map((adapter) => ({
          adapterName: adapter.adapterName,
          relativePath: adapter.relativePath,
          createdAt: adapter.createdAt
        }))
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Threadsmith bridge refresh failed");
  console.error(`Project root: ${projectRoot}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
