import { spawn } from "node:child_process";
import path from "node:path";

import type { Readable } from "node:stream";

import { READ_OFFICIAL_SOURCE_TIMEOUT_MS } from "./constants.js";

export type PennyToolsConfigShape = {
  corpusPath?: string | undefined;
  pythonPath?: string | undefined;
  repoRoot?: string | undefined;
};

async function drainStream(stream: Readable): Promise<string> {
  const parts: Buffer[] = [];

  for await (const chunk of stream) {
    parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(parts).toString("utf8");
}

function resolveRepoRoot(config: PennyToolsConfigShape): string {
  const fromConfig = config.repoRoot?.trim();
  const fromEnv = process.env.PENNY_REPO_ROOT?.trim();

  if (fromConfig) {
    return path.resolve(fromConfig);
  }

  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  throw new Error("missing_repo_root: set plugin repoRoot or PENNY_REPO_ROOT");
}

function resolvePython(config: PennyToolsConfigShape): string {
  return config.pythonPath?.trim() ?? process.env.PENNY_PYTHON?.trim() ?? "python3";
}

function readerScriptPath(repoRoot: string): string {
  return path.join(repoRoot, "tools", "read_official_source.py");
}

export type ReadOfficialOutcome = {
  stderr: string;
  parsed?: Record<string, unknown> | undefined;
};

function waitClose(child: ReturnType<typeof spawn>): Promise<number> {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (signal) {
        resolve(SIGNAL_EXIT_CODE);
        return;
      }
      resolve(typeof code === "number" ? code : -1);
    });
  });
}

const SIGNAL_EXIT_CODE = 124;

export async function readOfficialPageContent(
  config: PennyToolsConfigShape,
  url: string,
  outerSignal?: AbortSignal | undefined,
): Promise<ReadOfficialOutcome> {
  const repoRoot = resolveRepoRoot(config);
  const python = resolvePython(config);
  const script = readerScriptPath(repoRoot);

  const child = spawn(python, [script], {
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
  });

  const killTimer = setTimeout(() => {
    child.kill("SIGKILL");
  }, READ_OFFICIAL_SOURCE_TIMEOUT_MS);

  const removeAbort = outerSignal
    ? registerAbortKill(child, outerSignal)
    : undefined;

  try {
    child.stdin.write(`${JSON.stringify({ url })}\n`);
    child.stdin.end();

    const [stdout, stderr] = await Promise.all([
      drainStream(child.stdout),
      drainStream(child.stderr),
    ]);
    const exitCode = await waitClose(child);

    if (exitCode !== 0) {
      return {
        stderr: `python_exit_${String(exitCode)}: ${stderr.trim() || stdout.trim()}`,
      };
    }

    const parsed = parseStdoutJson(stdout);
    return { stderr: stderr.trim(), parsed };
  } finally {
    clearTimeout(killTimer);
    removeAbort?.();
  }
}

function registerAbortKill(
  child: ReturnType<typeof spawn>,
  signal: AbortSignal,
): () => void {
  if (signal.aborted) {
    child.kill("SIGKILL");
    return () => undefined;
  }

  const onAbort = () => {
    child.kill("SIGKILL");
  };
  signal.addEventListener("abort", onAbort, { once: true });
  return () => signal.removeEventListener("abort", onAbort);
}

function parseStdoutJson(stdout: string): Record<string, unknown> | undefined {
  const trimmed = stdout.trim();

  if (trimmed === "") {
    return undefined;
  }

  const direct = parseJsonRecord(trimmed);
  if (direct) {
    return direct;
  }

  const trailingJsonStart = trimmed.lastIndexOf("\n{");
  if (trailingJsonStart >= 0) {
    return parseJsonRecord(trimmed.slice(trailingJsonStart + 1));
  }

  const inlineJsonStart = trimmed.lastIndexOf("{");
  if (inlineJsonStart >= 0) {
    return parseJsonRecord(trimmed.slice(inlineJsonStart));
  }

  return undefined;
}

function parseJsonRecord(raw: string): Record<string, unknown> | undefined {
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
