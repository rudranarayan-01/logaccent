import { promises as fs } from "node:fs";

export async function ensureDirectory(path: string): Promise<void> {
  await fs.mkdir(path, {
    recursive: true,
  });
}