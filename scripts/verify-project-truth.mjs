import { loadProjectState } from "@threadsmith/fs-bridge";

const projectRoot = process.argv[2] ?? process.cwd();

try {
  const state = await loadProjectState(projectRoot);
  console.log("Threadsmith project truth check");
  console.log(`Project root: ${projectRoot}`);
  console.log(`Project: ${state.projectStatus.projectLabel}`);
  console.log(`Phase: ${state.currentPhase.phaseName}`);
  console.log(`Final state: ${state.acceptanceState.finalState}`);
  console.log("Result: project truth is schema-valid");
} catch (error) {
  console.error("Threadsmith project truth check");
  console.error(`Project root: ${projectRoot}`);
  console.error("Result: project truth is invalid");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
