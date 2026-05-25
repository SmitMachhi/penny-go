export function parseJsonObject(raw: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(raw.trim());

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function parseTrailingJsonObject(stdout: string): Record<string, unknown> | undefined {
  const trimmed = stdout.trim();

  if (trimmed === "") {
    return undefined;
  }

  const direct = parseJsonObject(trimmed);
  if (direct) {
    return direct;
  }

  const trailingJsonStart = trimmed.lastIndexOf("\n{");
  if (trailingJsonStart >= 0) {
    return parseJsonObject(trimmed.slice(trailingJsonStart + 1));
  }

  const inlineJsonStart = trimmed.lastIndexOf("{");
  if (inlineJsonStart >= 0) {
    return parseJsonObject(trimmed.slice(inlineJsonStart));
  }

  return undefined;
}
