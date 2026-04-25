import { App, PluginSettingTab, Setting } from 'obsidian';
import type ClaudeCodePlugin from './main';

export interface ClaudeCodeSettings {
  ccPath: string;
  startupArgs: string;
  openOnStartup: boolean;
  workingDirectory: string;
}

export const DEFAULT_SETTINGS: ClaudeCodeSettings = {
  ccPath: 'claude',
  startupArgs: '',
  openOnStartup: false,
  workingDirectory: '',
};

export class ClaudeCodeSettingTab extends PluginSettingTab {
  private plugin: ClaudeCodePlugin;

  constructor(app: App, plugin: ClaudeCodePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h3', { text: 'Claude Code CLI' });

    new Setting(containerEl)
      .setName('Claude Code executable')
      .setDesc(
        'Full path or command name for the Claude Code CLI. ' +
        'Use the full path (e.g. C:\\Users\\you\\AppData\\Roaming\\npm\\claude.cmd) ' +
        'if "claude" alone does not resolve from Obsidian.'
      )
      .addText(text =>
        text
          .setPlaceholder('claude')
          .setValue(this.plugin.settings.ccPath)
          .onChange(async value => {
            this.plugin.settings.ccPath = value.trim() || 'claude';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Startup arguments')
      .setDesc('Extra CLI flags appended when launching Claude Code, e.g. --no-update-check')
      .addText(text =>
        text
          .setPlaceholder('--no-update-check')
          .setValue(this.plugin.settings.startupArgs)
          .onChange(async value => {
            this.plugin.settings.startupArgs = value.trim();
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl('h3', { text: 'Working directory' });

    new Setting(containerEl)
      .setName('Project folder')
      .setDesc(
        'Absolute path to the folder where Claude Code sessions start. ' +
        'Leave empty to use the vault root. ' +
        'Example: C:\\Users\\you\\Documents\\my-project'
      )
      .addText(text => {
        text
          .setPlaceholder('(vault root)')
          .setValue(this.plugin.settings.workingDirectory)
          .onChange(async value => {
            this.plugin.settings.workingDirectory = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = '100%';
      });

    containerEl.createEl('h3', { text: 'Startup' });

    new Setting(containerEl)
      .setName('Open terminal on startup')
      .setDesc('Automatically open the Claude Code terminal when Obsidian starts')
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.openOnStartup).onChange(async value => {
          this.plugin.settings.openOnStartup = value;
          await this.plugin.saveSettings();
        })
      );
  }
}
