import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { WritebackProposal } from "@threadsmith/domain";
import { writebackProposalSchema } from "@threadsmith/domain";
import {
  THREADSMITH_DIR,
  getProposalsDir,
  getWritebackProposalPath
} from "./paths.ts";

export interface WritebackProposalArtifactSummary {
  proposalId: string;
  status: WritebackProposal["status"];
  phaseName: string;
  relativePath: string;
}

function formatProposalContents(proposal: WritebackProposal) {
  return `${JSON.stringify(proposal, null, 2)}\n`;
}

export async function writeWritebackProposalArtifact(
  projectRoot: string,
  proposal: WritebackProposal
): Promise<WritebackProposalArtifactSummary> {
  const parsed = writebackProposalSchema.parse(proposal);
  const relativePath = `${THREADSMITH_DIR}/proposals/${parsed.proposalId}.json`;

  await mkdir(getProposalsDir(projectRoot), { recursive: true });
  await writeFile(
    getWritebackProposalPath(projectRoot, parsed.proposalId),
    formatProposalContents(parsed),
    "utf8"
  );

  return {
    proposalId: parsed.proposalId,
    status: parsed.status,
    phaseName: parsed.phaseName,
    relativePath
  };
}

export async function readWritebackProposalArtifact(
  projectRoot: string,
  proposalId: string
) {
  try {
    const contents = await readFile(
      getWritebackProposalPath(projectRoot, proposalId),
      "utf8"
    );

    return writebackProposalSchema.parse(JSON.parse(contents));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}
