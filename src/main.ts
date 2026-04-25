import { Notice, Plugin } from 'obsidian';
import { ClaudeBridge } from './claude-bridge';
import { ClaudeCodeSettingTab, ClaudeCodeSettings, DEFAULT_SETTINGS } from './settings';
import { TerminalManager } from './terminal-manager';
import { ClaudeTerminalView, CLAUDE_TERMINAL_VIEW } from './views/terminal-view';

export default class ClaudeCodePlugin extends Plugin {
  settings!: ClaudeCodeSettings;

  private terminalManager!: TerminalManager;
  private claudeBridge!: ClaudeBridge;

  async onload(): Promise<void> {
    await this.loadSettings();

    const vaultRoot = (this.app.vault.adapter as unknown as { basePath: string }).basePath;
    const pluginDir = `${vaultRoot}/${this.manifest.dir}`;
    this.terminalManager = new TerminalManager(this.app, pluginDir);
    this.claudeBridge = new ClaudeBridge(this.terminalManager);

    this.registerView(CLAUDE_TERMINAL_VIEW, leaf => new ClaudeTerminalView(leaf));

    this.addRibbonIcon('terminal', 'Open Claude Code', () => {
      this.openClaudeCode();
    });

    this.addCommand({
      id: 'open-claude-code',
      name: 'Open Claude Code terminal',
      callback: () => this.openClaudeCode(),
    });

    this.addCommand({
      id: 'kill-claude-code',
      name: 'Kill Claude Code session',
      callback: () => {
        this.claudeBridge.kill();
        new Notice('Claude Code session terminated.');
      },
    });

    this.addSettingTab(new ClaudeCodeSettingTab(this.app, this));

    if (this.settings.openOnStartup) {
      this.app.workspace.onLayoutReady(() => this.openClaudeCode());
    }
  }

  onunload(): void {
    this.claudeBridge.kill();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private openClaudeCode(): void {
    const vaultPath = (
      this.app.vault.adapter as unknown as { basePath?: string }
    ).basePath;

    if (!vaultPath) {
      new Notice('Claude Code: could not determine vault path.');
      return;
    }

    this.claudeBridge.launch({
      vaultPath,
      ccPath: this.settings.ccPath,
      startupArgs: this.settings.startupArgs,
    });
  }
}
