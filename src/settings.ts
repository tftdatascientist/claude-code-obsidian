import { App, PluginSettingTab, Setting } from 'obsidian';
import type ClaudeCodePlugin from './main';

export interface ClaudeCodeSettings {
  ccPath: string;
  startupArgs: string;
  openOnStartup: boolean;
}

export const DEFAULT_SETTINGS: ClaudeCodeSettings = {
  ccPath: 'claude',
  startupArgs: '',
  openOnStartup: false,
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

    new Setting(containerEl)
      .setName('Claude Code path')
      .setDesc('Path or command name for the Claude Code CLI (default: cc)')
      .addText(text =>
        text
          .setPlaceholder('cc')
          .setValue(this.plugin.settings.ccPath)
          .onChange(async value => {
            this.plugin.settings.ccPath = value.trim() || 'cc';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Startup arguments')
      .setDesc('Additional CLI arguments passed when launching Claude Code')
      .addText(text =>
        text
          .setPlaceholder('e.g. --no-update-check')
          .setValue(this.plugin.settings.startupArgs)
          .onChange(async value => {
            this.plugin.settings.startupArgs = value.trim();
            await this.plugin.saveSettings();
          })
      );

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
