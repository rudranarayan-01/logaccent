import path from "node:path";

export function resolveLogFile(
  directory: string,
  filename: string,
): string {
  return path.join(directory, filename);
}