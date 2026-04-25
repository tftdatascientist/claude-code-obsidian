import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

export const CLAUDE_TERMINAL_VIEW = 'claude-terminal-view';

export class ClaudeTerminalView extends ItemView {
  private terminal!: Terminal;
  private fitAddon!: FitAddon;
  private resizeObserver: ResizeObserver | null = null;
  private inputCallback: ((data: string) => void) | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return CLAUDE_TERMINAL_VIEW;
  }

  getDisplayText(): string {
    return 'Claude Code';
  }

  getIcon(): string {
    return 'terminal';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('claude-terminal-container');

    // xterm.js theme requires resolved hex values — CSS variables not supported
    const cs = getComputedStyle(document.body);
    const resolve = (v: string, fallback: string) =>
      cs.getPropertyValue(v).trim() || fallback;

    this.terminal = new Terminal({
      cursorBlink: true,
      fontFamily: resolve('--font-monospace', 'monospace'),
      fontSize: 13,
      theme: {
        background: resolve('--background-primary', '#1e1e2e'),
        foreground: resolve('--text-normal', '#cdd6f4'),
        cursor:     resolve('--text-accent', '#89b4fa'),
        selectionBackground: resolve('--text-selection', '#45475a'),
      },
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(container);
    this.fitAddon.fit();

    this.terminal.onData(data => {
      this.inputCallback?.(data);
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.fitAddon.fit();
    });
    this.resizeObserver.observe(container);
  }

  async onClose(): Promise<void> {
    this.resizeObserver?.disconnect();
    this.terminal?.dispose();
  }

  write(data: string): void {
    this.terminal?.write(data);
  }

  onInput(cb: (data: string) => void): void {
    this.inputCallback = cb;
  }

  get cols(): number {
    return this.terminal?.cols ?? 80;
  }

  get rows(): number {
    return this.terminal?.rows ?? 24;
  }

  fit(): void {
    this.fitAddon?.fit();
  }
}
