import { spawn } from "node:child_process";

import { parseTrailingJsonObject } from "./json-parse.js";
import {
  attachAbortKill,
  drainStream,
  waitForProcessClose,
} from "./subprocess-io.js";

export type JsonStdinSubprocessOutcome = {
  stderr: string;
  parsed?: Record<string, unknown> | undefined;
};

export async function runJsonStdinSubprocess(input: {
  command: string;
  args: readonly string[];
  payload: unknown;
  timeoutMs: number;
  signal?: AbortSignal | undefined;
}): Promise<JsonStdinSubprocessOutcome> {
  const child = spawn(input.command, [...input.args], {
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
  });

  const killTimer = setTimeout(() => {
    child.kill("SIGKILL");
  }, input.timeoutMs);

  const removeAbort = input.signal
    ? attachAbortKill(child, input.signal)
    : undefined;

  try {
    child.stdin.write(`${JSON.stringify(input.payload)}\n`);
    child.stdin.end();

    const [stdout, stderr] = await Promise.all([
      drainStream(child.stdout),
      drainStream(child.stderr),
    ]);
    const exitCode = await waitForProcessClose(child);

    if (exitCode !== 0) {
      return {
        stderr: `process_exit_${String(exitCode)}: ${stderr.trim() || stdout.trim()}`,
      };
    }

    return { stderr: stderr.trim(), parsed: parseTrailingJsonObject(stdout) };
  } finally {
    clearTimeout(killTimer);
    removeAbort?.();
  }
}
