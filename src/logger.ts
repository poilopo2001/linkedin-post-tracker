import { appendFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";

const LOG_FILE = "./output/growth-logs.txt";

function ensureLogDir() {
  const dir = dirname(LOG_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function log(message: string) {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  const line = `[${timestamp}] ${message}`;

  console.log(line);

  try {
    ensureLogDir();
    appendFileSync(LOG_FILE, line + "\n", "utf-8");
  } catch {
    // Ignore file errors
  }
}

export function clearLog() {
  try {
    ensureLogDir();
    appendFileSync(LOG_FILE, `\n=== NEW RUN ${new Date().toISOString()} ===\n`, "utf-8");
  } catch {
    // Ignore
  }
}
