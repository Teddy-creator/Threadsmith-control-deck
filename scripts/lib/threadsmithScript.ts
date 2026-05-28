import { resolve } from "node:path";

export function hasFlag(args: string[], flag: string) {
  return args.includes(flag);
}

export function readFlagValue(args: string[], flag: string) {
  const index = args.indexOf(flag);

  return index >= 0 ? args[index + 1] ?? null : null;
}

export function positionalArgs(args: string[], flagsWithoutValue: string[] = []) {
  const ignoredFlags = new Set(flagsWithoutValue);

  return args.filter((arg) => !ignoredFlags.has(arg));
}

export function resolvePathArg(value: string | null | undefined) {
  return value ? resolve(value) : null;
}

export function resolveProjectRootArg(value: string | null | undefined) {
  return resolve(value ?? process.cwd());
}

export function printJson(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

export function failWithThreadsmithError(
  title: string,
  projectRoot: string | null,
  error: unknown
): never {
  console.error(title);

  if (projectRoot) {
    console.error(`Project root: ${projectRoot}`);
  }

  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
