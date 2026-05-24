import { readFile } from "node:fs/promises";

import type { ProgramProfile } from "./corpus-types.js";

/** Parse JSON line records from verified-programs corpus. */
export function parseJsonlPrograms(raw: string): ProgramProfile[] {
  const programs: ProgramProfile[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();

    if (trimmed === "") {
      continue;
    }

    try {
      programs.push(JSON.parse(trimmed) as ProgramProfile);
    } catch {
      // skip malformed lines rather than aborting the entire load
    }
  }

  return programs;
}

export async function loadProgramsFromFile(absPath: string): Promise<ProgramProfile[]> {
  const raw = await readFile(absPath, "utf8");
  return parseJsonlPrograms(raw);
}
