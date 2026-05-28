import { summarizeProposalVisibility } from "@threadsmith/fs-bridge";
import {
  failWithThreadsmithError,
  printJson,
  resolveProjectRootArg
} from "./lib/threadsmithScript.ts";

const projectRoot = resolveProjectRootArg(process.argv[2]);

async function main() {
  const summary = await summarizeProposalVisibility(projectRoot);

  printJson(summary);
}

main().catch((error) => {
  failWithThreadsmithError("Threadsmith proposal status failed", projectRoot, error);
});
