// Lightweight MCP installer helper for the Omega Prime Deployer extension
// - Detects available installers (npx, uvx, docker)
// - Chooses best-fit strategy and exposes install/verify APIs
// - Contains a CloudMCP.run placeholder for one-click cloud deploys

import { exec as _exec } from 'child_process';
import { promisify } from 'util';
const exec = promisify(_exec);

export type InstallerMethod = 'npx' | 'uvx' | 'docker' | 'cloud';

export interface InstallResult {
  success: boolean;
  method: InstallerMethod;
  stdout?: string;
  stderr?: string;
  error?: string;
}

export interface InstallOptions {
  name: string; // logical name of MCP server
  prefer?: InstallerMethod[]; // preference order
  args?: string[]; // additional args for the installer
  maxRetries?: number;
  backoffMs?: number;
}

// Quick environment detection
export async function detectAvailableMethods(): Promise<InstallerMethod[]> {
  const methods: InstallerMethod[] = [];
  try {
    await exec('command -v npx');
    methods.push('npx');
  } catch (e) {}
  try {
    await exec('command -v uvx');
    methods.push('uvx');
  } catch (e) {}
  try {
    await exec('command -v docker');
    methods.push('docker');
  } catch (e) {}
  // Cloud is always available as a fallback (requires credentials)
  methods.push('cloud');
  return methods;
}

// Simple exponential backoff helper
async function retryWithBackoff<T>(fn: () => Promise<T>, attempts = 3, backoffMs = 500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const wait = backoffMs * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

// NPX installer adapter (example: npx mcp-get install <name>)
async function installWithNpx(name: string, args: string[] = []): Promise<InstallResult> {
  const cmd = `npx mcp-get install ${name} ${args.join(' ')}`.trim();
  try {
    const { stdout, stderr } = await exec(cmd, { timeout: 1000 * 60 * 5 });
    return { success: true, method: 'npx', stdout, stderr };
  } catch (e: any) {
    return { success: false, method: 'npx', error: e.message, stderr: e.stderr, stdout: e.stdout };
  }
}

// UVX installer adapter placeholder
async function installWithUvx(name: string, args: string[] = []): Promise<InstallResult> {
  const cmd = `uvx install ${name} ${args.join(' ')}`.trim();
  try {
    const { stdout, stderr } = await exec(cmd, { timeout: 1000 * 60 * 5 });
    return { success: true, method: 'uvx', stdout, stderr };
  } catch (e: any) {
    return { success: false, method: 'uvx', error: e.message, stderr: e.stderr, stdout: e.stdout };
  }
}

// Docker installer adapter example (pull + run)
async function installWithDocker(name: string, args: string[] = []): Promise<InstallResult> {
  try {
    // For MCP servers this might be a standard image lookup; this is a placeholder
    const pullCmd = `docker pull mcp/${name}:latest`;
    await exec(pullCmd, { timeout: 1000 * 60 * 3 });
    const runCmd = `docker run -d --name mcp-${name} ${args.join(' ')} mcp/${name}:latest`;
    const { stdout, stderr } = await exec(runCmd, { timeout: 1000 * 60 * 5 });
    return { success: true, method: 'docker', stdout, stderr };
  } catch (e: any) {
    return { success: false, method: 'docker', error: e.message, stderr: e.stderr, stdout: e.stdout };
  }
}

// CloudMCP placeholder: should call CloudMCP.run APIs after OAuth and return instance connection info
async function installWithCloud(name: string, args: string[] = []): Promise<InstallResult> {
  // Placeholder: here we would call CloudMCP.run APIs to create an instance
  // For now return a not-implemented style response
  return { success: false, method: 'cloud', error: 'CloudMCP.run integration not configured' };
}

export async function installMcpServer(options: InstallOptions): Promise<InstallResult> {
  const methods = await detectAvailableMethods();
  const prefer = options.prefer || methods;
  const maxRetries = options.maxRetries ?? 3;
  const backoffMs = options.backoffMs ?? 500;

  // Choose the first available method from preferences
  const chosen = prefer.find((p) => methods.includes(p)) || methods[0];

  const runInstall = async (): Promise<InstallResult> => {
    switch (chosen) {
      case 'npx':
        return await installWithNpx(options.name, options.args);
      case 'uvx':
        return await installWithUvx(options.name, options.args);
      case 'docker':
        return await installWithDocker(options.name, options.args);
      case 'cloud':
        return await installWithCloud(options.name, options.args);
    }
  };

  try {
    return await retryWithBackoff(runInstall, maxRetries, backoffMs);
  } catch (e: any) {
    return { success: false, method: chosen as InstallerMethod, error: e?.message || String(e) };
  }
}

// Lightweight verify function: check process or port (placeholder)
export async function verifyMcpServer(name: string): Promise<{ running: boolean; info?: string }> {
  try {
    // Simple check: is docker container present?
    const { stdout } = await exec(`docker ps --filter name=mcp-${name} --format '{{.Names}}'`);
    if (stdout && stdout.trim().length > 0) return { running: true, info: stdout.trim() };
    return { running: false };
  } catch (e: any) {
    return { running: false, info: e?.message };
  }
}

// Export a small helper to get install recommendations for UI
export async function getInstallRecommendations(name: string): Promise<{ recommended: InstallerMethod; available: InstallerMethod[] }> {
  const available = await detectAvailableMethods();
  // Recommend docker if available and image likely exists, otherwise npx
  const recommended: InstallerMethod = available.includes('docker') ? 'docker' : (available.includes('npx') ? 'npx' : 'cloud');
  return { recommended, available };
}

// Example usage (for extension wiring):
// import { installMcpServer } from './mcpInstaller';
// const result = await installMcpServer({ name: 'postgres-mcp', prefer: ['docker','npx'] });

export default { installMcpServer, getInstallRecommendations, verifyMcpServer };
