import { Sandbox } from "@vercel/sandbox";

export const OPENCODE_PORT = 4096;
export const OPENCODE_BIN = "/home/vercel-sandbox/.opencode/bin/opencode";
export const OPENCODE_LOG_PATH = "/tmp/opencode.log";
export const OPENCODE_CONFIG_PATH =
  "/home/vercel-sandbox/.config/opencode/opencode.json";

export type OpenCodeConfig = {
  model: string;
  baseUrl: string;
  apiKey: string;
};

export function buildOpenCodeConfig({ model, baseUrl, apiKey }: OpenCodeConfig): string {
  return JSON.stringify(
    {
      $schema: "https://opencode.ai/config.json",
      enabled_providers: ["openai"],
      provider: {
        openai: {
          options: {
            baseURL: baseUrl,
            apiKey,
          },
          models: {
            [model]: {},
          },
        },
      },
      model,
    },
    null,
    2,
  );
}

export async function installOpenCode(sandbox: Sandbox): Promise<void> {
  const install = await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", "curl -fsSL https://opencode.ai/install | bash"],
  });
  if (install.exitCode !== 0) {
    throw new Error(`opencode install failed (exit ${install.exitCode})`);
  }
  const version = await sandbox.runCommand(OPENCODE_BIN, ["--version"]);
  if (version.exitCode !== 0) {
    throw new Error(`opencode binary not found after install`);
  }
}

export async function writeOpenCodeConfig(
  sandbox: Sandbox,
  config: OpenCodeConfig,
): Promise<void> {
  await sandbox.writeFiles([
    {
      path: OPENCODE_CONFIG_PATH,
      content: Buffer.from(buildOpenCodeConfig(config)),
    },
  ]);
}

export async function startOpenCodeServer(
  sandbox: Sandbox,
  password: string,
): Promise<void> {
  await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-c",
      `OPENCODE_SERVER_PASSWORD=${password} nohup ${OPENCODE_BIN} serve --hostname 0.0.0.0 --port ${OPENCODE_PORT} > ${OPENCODE_LOG_PATH} 2>&1 &`,
    ],
  });
}

export async function waitForOpenCodeHealthy(
  sandbox: Sandbox,
  password: string,
  timeoutMs = 30_000,
): Promise<boolean> {
  const auth = Buffer.from(`opencode:${password}`).toString("base64");
  const url = sandbox.domain(OPENCODE_PORT);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/global/health`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (res.ok) {
        const body = (await res.json()) as { healthy?: boolean };
        if (body.healthy) return true;
      }
    } catch {
      // not yet listening
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export async function lockDownEgress(
  sandbox: Sandbox,
  allow: string[] = ["openrouter.ai"],
): Promise<void> {
  await sandbox.update({ networkPolicy: { allow } });
}

export function basicAuthHeader(password: string): string {
  return `Basic ${Buffer.from(`opencode:${password}`).toString("base64")}`;
}
