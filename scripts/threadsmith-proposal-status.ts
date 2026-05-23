import { summarizeProposalVisibility } from "@threadsmith/fs-bridge";
import { resolve } from "node:path";

const projectRoot = resolve(process.argv[2] ?? process.cwd());

async function main() {
  const summary = await summarizeProposalVisibility(projectRoot);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("Threadsmith proposal status failed");
  console.error(`Project root: ${projectRoot}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
