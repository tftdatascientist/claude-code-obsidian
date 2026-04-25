import { App, WorkspaceLeaf } from 'obsidian';
import * as path from 'path';
import * as cp from 'child_process';
import { ClaudeTerminalView, CLAUDE_TERMINAL_VIEW } from './views/terminal-view';

export interface SpawnOptions {
  ccPath: string;
  startupArgs: string;
  vaultPath: string;
}

export class TerminalManager {
  private app: App;
  private pluginDir: string;
  private proxy: cp.ChildProcess | null = null;

  constructor(app: App, pluginDir: string) {
    this.app = app;
    this.pluginDir = pluginDir;
  }

  async openAndLaunch(options: SpawnOptions): Promise<void> {
    const leaf = await this.ensureLeaf();
    const view = leaf.view as ClaudeTerminalView;

    this.killExisting();

    view.write('\x1b[36m[Claude Code] Starting PTY proxy...\x1b[0m\r\n');

    const ptyModulePath = path.join(this.pluginDir, 'node_modules', '@lydell', 'node-pty');
    const proxyScript  = path.join(this.pluginDir, 'pty-proxy.js');
    const extraArgs    = options.startupArgs.split(' ').filter(Boolean);

    let nodePath: string;
    try {
      // Resolve node.exe — 'where node' uses shell PATH (works from GUI apps too)
      const result = cp.execSync('where node', { shell: 'cmd.exe', encoding: 'utf8' });
      nodePath = result.split('\r\n')[0].split('\n')[0].trim();
      view.write(`\x1b[36m[PTY] node: ${nodePath}\x1b[0m\r\n`);
    } catch {
      view.write('\x1b[31m[PTY] node.exe not found in PATH\x1b[0m\r\n');
      return;
    }

    view.write(`\x1b[36m[PTY] Spawning: ${options.ccPath}\x1b[0m\r\n`);

    this.proxy = cp.spawn(
      nodePath,
      [proxyScript, ptyModulePath, 'cmd.exe', options.vaultPath,
        String(view.cols), String(view.rows),
        '/K', options.ccPath, ...extraArgs],
      { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }
    );

    this.proxy.stderr?.on('data', (d: Buffer) => {
      view.write(`\x1b[31m[PTY ERR] ${d.toString()}\x1b[0m\r\n`);
    });

    let readBuf = Buffer.alloc(0);
    this.proxy.stdout?.on('data', (chunk: Buffer) => {
      readBuf = Buffer.concat([readBuf, chunk]);
      while (readBuf.length >= 5) {
        const type = String.fromCharCode(readBuf[0]);
        const len  = readBuf.readUInt32BE(1);
        if (readBuf.length < 5 + len) break;
        const payload = readBuf.slice(5, 5 + len);
        readBuf = readBuf.slice(5 + len);

        if (type === 'D') {
          view.write(payload.toString());
        } else if (type === 'X') {
          const code = payload.readInt32BE(0);
          view.write(`\r\n\x1b[33m[Process exited with code ${code}]\x1b[0m\r\n`);
        }
      }
    });

    this.proxy.on('close', () => { this.proxy = null; });
    this.proxy.on('error', (err: Error) => {
      view.write(`\x1b[31m[PTY] proxy error: ${err.message}\x1b[0m\r\n`);
    });

    // Wire keyboard input → proxy stdin (framed)
    view.onInput(data => {
      if (!this.proxy?.stdin?.writable) return;
      const payload = Buffer.from(data);
      const header  = Buffer.alloc(5);
      header[0] = 'I'.charCodeAt(0);
      header.writeUInt32BE(payload.length, 1);
      this.proxy.stdin.write(Buffer.concat([header, payload]));
    });

    // Wire resize
    this.app.workspace.on('resize', () => {
      view.fit();
      this.sendResize(view.cols, view.rows);
    });
  }

  private sendResize(cols: number, rows: number): void {
    if (!this.proxy?.stdin?.writable) return;
    const buf = Buffer.alloc(9);
    buf[0] = 'R'.charCodeAt(0);
    buf.writeUInt32BE(4, 1);
    buf.writeUInt16BE(cols, 5);
    buf.writeUInt16BE(rows, 7);
    this.proxy.stdin.write(buf);
  }

  killExisting(): void {
    if (this.proxy) {
      this.proxy.kill();
      this.proxy = null;
    }
  }

  private async ensureLeaf(): Promise<WorkspaceLeaf> {
    const existing = this.app.workspace.getLeavesOfType(CLAUDE_TERMINAL_VIEW);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return existing[0];
    }
    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({ type: CLAUDE_TERMINAL_VIEW, active: true });
    this.app.workspace.revealLeaf(leaf);
    return leaf;
  }
}
