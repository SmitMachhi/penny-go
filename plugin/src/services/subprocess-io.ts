import type { Readable } from "node:stream";
import type { ChildProcessWithoutNullStreams } from "node:child_process";

const SIGNAL_EXIT_CODE = 124;

export async function drainStream(stream: Readable): Promise<string> {
  const parts: Buffer[] = [];

  for await (const chunk of stream) {
    parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(parts).toString("utf8");
}

export async function waitForProcessClose(child: ChildProcessWithoutNullStreams): Promise<number> {
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

export function attachAbortKill(
  child: ChildProcessWithoutNullStreams,
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
