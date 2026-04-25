import type { TerminalManager, SpawnOptions } from './terminal-manager';

export class ClaudeBridge {
  private manager: TerminalManager;

  constructor(manager: TerminalManager) {
    this.manager = manager;
  }

  async launch(options: SpawnOptions): Promise<void> {
    await this.manager.openAndLaunch(options);
  }

  kill(): void {
    this.manager.killExisting();
  }
}
