import { adoptWritebackProposalArtifact } from "@threadsmith/fs-bridge";
import { resolve } from "node:path";

const projectRoot = resolve(process.argv[2] ?? process.cwd());
const proposalId = process.argv[3];

async function main() {
  if (!proposalId) {
    throw new Error(
      "Missing proposal id. Usage: npm run threadsmith:adopt-proposal -- <project-root> <proposal-id>"
    );
  }

  const result = await adoptWritebackProposalArtifact(projectRoot, proposalId);

  console.log(JSON.stringify({ projectRoot, ...result }, null, 2));
}

main().catch((error) => {
  console.error("Threadsmith proposal adoption failed");
  console.error(`Project root: ${projectRoot}`);
  if (proposalId) {
    console.error(`Proposal id: ${proposalId}`);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
