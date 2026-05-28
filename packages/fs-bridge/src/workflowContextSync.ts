import type { ProjectState } from "@threadsmith/domain";
import { buildContextPacket } from "@threadsmith/runtime";
import {
  readEvidenceSummary,
  readRepoMap,
  writeCurrentContextPacket
} from "./fileStore.ts";
import { CONTEXT_FILES, THREADSMITH_DIR } from "./paths.ts";

async function readOptionalContextArtifact<T>(
  readArtifact: () => Promise<T>
): Promise<T | undefined> {
  try {
    return await readArtifact();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export async function syncCurrentContextPacket(args: {
  projectRoot: string;
  state: ProjectState;
  createdAt: string;
}) {
  const repoMap = await readOptionalContextArtifact(() =>
    readRepoMap(args.projectRoot)
  );
  const evidenceSummary = await readOptionalContextArtifact(() =>
    readEvidenceSummary(args.projectRoot)
  );
  const packet = await writeCurrentContextPacket(
    args.projectRoot,
    buildContextPacket(args.state, {
      generatedAt: args.createdAt,
      repoMap,
      evidenceSummary,
      recentDiff: repoMap
        ? {
            status: repoMap.git.status,
            changedFiles: repoMap.git.changedFiles,
            command: repoMap.git.command,
            summary:
              repoMap.git.status === "dirty"
                ? `Repo map reported ${repoMap.git.changedFiles.length} changed file(s).`
                : repoMap.git.status === "clean"
                  ? "Repo map reports a clean working tree."
                  : "Repo map could not determine git status."
          }
        : undefined
    })
  );

  return {
    packetId: packet.packetId,
    packetPath: `${THREADSMITH_DIR}/context/${CONTEXT_FILES.currentPacket}`
  };
}
