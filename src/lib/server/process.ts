import { spawn, type ChildProcess } from "node:child_process";

type ProcessResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

const MAX_OUTPUT_LENGTH = 8_000;

function appendCapped(current: string, chunk: Buffer): string {
  if (current.length >= MAX_OUTPUT_LENGTH) {
    return current;
  }

  return (current + chunk.toString("utf8")).slice(0, MAX_OUTPUT_LENGTH);
}

function killProcessTree(child: ChildProcess): void {
  if (typeof child.pid !== "number") {
    child.kill("SIGKILL");
    return;
  }

  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {
      // The process already exited.
    }
  }
}

export function runProcess(
  command: string,
  args: readonly string[],
  timeoutMs: number,
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child);
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout = appendCapped(stdout, chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr = appendCapped(stderr, chunk);
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(error);
      }
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        resolve({ exitCode: code, stdout, stderr, timedOut });
      }
    });
  });
}
