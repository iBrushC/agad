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
      "-lc",
      `: > ${OPENCODE_LOG_PATH}; OPENCODE_SERVER_PASSWORD=${password} exec ${OPENCODE_BIN} serve --hostname 0.0.0.0 --port ${OPENCODE_PORT} >> ${OPENCODE_LOG_PATH} 2>&1`,
    ],
    env: { OPENCODE_SERVER_PASSWORD: password },
    detached: true,
  });
}

export async function readOpenCodeLog(sandbox: Sandbox, maxBytes = 4000): Promise<string> {
  try {
    const buf = await sandbox.readFileToBuffer({ path: OPENCODE_LOG_PATH });
    if (!buf) return "";
    const text = buf.toString("utf8");
    return text.length > maxBytes ? text.slice(-maxBytes) : text;
  } catch {
    return "";
  }
}

export async function waitForOpenCodeHealthy(
  sandbox: Sandbox,
  password: string,
  timeoutMs = 30_000,
): Promise<{ healthy: boolean; lastError?: string }> {
  const auth = Buffer.from(`opencode:${password}`).toString("base64");
  const url = sandbox.domain(OPENCODE_PORT);
  const deadline = Date.now() + timeoutMs;
  let lastError: string | undefined;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/global/health`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (res.ok) {
        const body = (await res.json()) as { healthy?: boolean };
        if (body.healthy) return { healthy: true };
        lastError = `health endpoint returned healthy=${body.healthy}`;
      } else {
        lastError = `health endpoint returned status=${res.status}`;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return { healthy: false, lastError };
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

export const PROJECT_DIR = "/home/vercel-sandbox/project";
export const PROJECT_INDEX_HTML = `${PROJECT_DIR}/index.html`;
export const PROJECT_SCREENSHOT_PNG = `${PROJECT_DIR}/screenshot.png`;
export const SCREENSHOT_SCRIPT = `${PROJECT_DIR}/screenshot.js`;
const MOTION_BOOTSTRAP_MARKER = `${PROJECT_DIR}/.motion-bootstrapped`;

export async function ensureProjectDir(sandbox: Sandbox): Promise<void> {
  await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", `mkdir -p ${PROJECT_DIR}`],
  });
}

export async function installMotion(sandbox: Sandbox): Promise<void> {
  await ensureProjectDir(sandbox);
  const marker = await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", `test -f ${MOTION_BOOTSTRAP_MARKER} && echo OK || echo MISSING`],
  });
  const markerOut = await marker.stdout();
  if (markerOut.includes("OK")) return;

  const init = await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-c",
      `cd ${PROJECT_DIR} && (test -f package.json || npm init -y >/dev/null 2>&1) && npm install --no-audit --no-fund motion 2>&1 | tail -n 10`,
    ],
  });
  if (init.exitCode !== 0) {
    const err = await init.stderr();
    throw new Error(`motion install failed: ${err.slice(0, 500)}`);
  }

  const stamp = await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", `date -u +%Y-%m-%dT%H:%M:%SZ > ${MOTION_BOOTSTRAP_MARKER}`],
  });
  if (stamp.exitCode !== 0) {
    throw new Error("failed to write motion bootstrap marker");
  }
}

export async function installChromium(sandbox: Sandbox): Promise<void> {
  const check = await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", "test -x /home/vercel-sandbox/.cache/ms-playwright/chromium-*/chrome-linux/chrome && echo OK || echo MISSING"],
  });
  const out = await check.stdout();
  if (out.includes("OK")) return;
  const install = await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-c",
      "sudo npx --yes playwright install chromium 2>&1 | tail -n 20",
    ],
  });
  if (install.exitCode !== 0) {
    const err = await install.stderr();
    throw new Error(`chromium install failed: ${err.slice(0, 500)}`);
  }
}

export async function writeScreenshotScript(sandbox: Sandbox): Promise<void> {
  await sandbox.writeFiles([
    {
      path: SCREENSHOT_SCRIPT,
      content: Buffer.from(`const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file://${PROJECT_INDEX_HTML}', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: '${PROJECT_SCREENSHOT_PNG}', fullPage: false });
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
`),
      mode: 0o755,
    },
  ]);
}

export async function renderProjectScreenshot(sandbox: Sandbox): Promise<Buffer | null> {
  await ensureProjectDir(sandbox);
  await installChromium(sandbox);
  await writeScreenshotScript(sandbox);
  const nodeModulesCheck = await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", "test -d /home/vercel-sandbox/project/node_modules/playwright && echo OK || echo NEEDS"],
  });
  const nm = await nodeModulesCheck.stdout();
  if (!nm.includes("OK")) {
    const init = await sandbox.runCommand({
      cmd: "bash",
      args: ["-c", `cd ${PROJECT_DIR} && npm init -y >/dev/null 2>&1 && npm install --no-audit --no-fund playwright 2>&1 | tail -n 5`],
    });
    if (init.exitCode !== 0) {
      const err = await init.stderr();
      throw new Error(`playwright npm install failed: ${err.slice(0, 500)}`);
    }
  }
  const run = await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", `cd ${PROJECT_DIR} && node screenshot.js`],
  });
  if (run.exitCode !== 0) {
    const err = await run.stderr();
    throw new Error(`screenshot failed: ${err.slice(0, 500)}`);
  }
  return sandbox.readFileToBuffer({ path: PROJECT_SCREENSHOT_PNG });
}
