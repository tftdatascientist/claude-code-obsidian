# Claude Code Terminal — Obsidian Plugin

Run [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI sessions directly inside Obsidian via an embedded xterm.js terminal panel.

![Obsidian](https://img.shields.io/badge/Obsidian-%3E%3D1.4.0-blueviolet)
![Platform](https://img.shields.io/badge/platform-Windows%20(desktop)-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What it does

Opens a full PTY terminal tab inside Obsidian and launches `cc` (Claude Code CLI) with your vault root as the working directory. You get native terminal UX — colors, cursor, resize — without leaving Obsidian.

**Flow:**

```
Obsidian command / ribbon icon
        │
        ▼
  ClaudeBridge.launch()
        │
        ▼
  TerminalManager  ──► spawns pty-proxy.js (node-pty)
        │                       │
        ▼                       ▼
  ClaudeTerminalView         cmd.exe → cc <vault-path>
  (xterm.js panel)   ◄──── stdout framing protocol (D/X/I/R)
```

---

## Requirements

| Requirement | Version |
|---|---|
| Obsidian | ≥ 1.4.0 (desktop only) |
| Node.js | ≥ 18 (must be in PATH) |
| Claude Code CLI (`cc`) | any — [install guide](https://docs.anthropic.com/en/docs/claude-code) |
| OS | Windows 10/11 (node-pty native binding) |

---

## Installation

### Manual (current)

1. Clone or download this repository.
2. Install dependencies:
   ```bash
   npm install
   npm run build
   ```
3. Copy the build output into your vault's plugin folder:
   ```
   <vault>/.obsidian/plugins/claude-code-obsidian/
   ├── main.js
   ├── manifest.json
   ├── styles.css
   ├── pty-proxy.js
   └── node_modules/@lydell/node-pty/   (native binary)
   ```
   The `npm run package` script does this copy automatically if `VAULT_PATH` is set:
   ```bash
   VAULT_PATH=/path/to/your/vault npm run package
   ```
4. Reload Obsidian → **Settings → Community plugins → Enable** *Claude Code Terminal*.

---

## Configuration

Open **Settings → Claude Code Terminal**:

| Setting | Default | Description |
|---|---|---|
| **Claude Code path** | `cc` | Command or absolute path to the `cc` / `claude` executable |
| **Startup arguments** | *(empty)* | Extra CLI flags passed on launch, e.g. `--no-update-check` |
| **Open terminal on startup** | off | Automatically open the terminal when Obsidian loads |

### Finding your `cc` path

```bash
# Windows (PowerShell or cmd)
where cc
where claude

# Example result
C:\Users\you\AppData\Roaming\npm\cc.cmd
```

Paste the full path into *Claude Code path* if `cc` alone doesn't resolve from Obsidian's GUI process.

---

## Usage

### Commands (Ctrl+P palette)

| Command | Description |
|---|---|
| **Open Claude Code terminal** | Opens (or reveals) the terminal tab and starts a CC session |
| **Kill Claude Code session** | Terminates the running CC process |

### Ribbon icon

Click the **terminal** icon in the left ribbon to open Claude Code.

### Inside the terminal

The terminal is a full interactive PTY — everything you can do in a standalone `cc` session works here:

```
> cc
Claude Code v1.x.x  (vault: C:\Users\you\Documents\MyVault)
> /help
> /new-task Summarise today's notes
> q
```

Keyboard shortcuts, colors, mouse selection, and window resize all work natively.

---

## Architecture

### Source layout

```
src/
├── main.ts              — Plugin entry point, command registration
├── settings.ts          — Settings tab (ccPath, startupArgs, openOnStartup)
├── terminal-manager.ts  — PTY proxy lifecycle, framing protocol, xterm wiring
├── claude-bridge.ts     — Thin facade: launch / kill
└── views/
    └── terminal-view.ts — ItemView wrapping xterm.js + FitAddon
```

### PTY proxy protocol

Because Obsidian's renderer process cannot spawn a PTY directly, `pty-proxy.js` runs as a plain Node.js child process that:

1. Spawns `cmd.exe` via `@lydell/node-pty` (native, Windows-only).
2. Communicates with the renderer over stdin/stdout using a 5-byte length-prefixed framing:

| Byte 0 | Bytes 1–4 | Bytes 5…N |
|--------|-----------|-----------|
| `D` — data out | uint32 BE length | terminal output |
| `X` — exit | uint32 BE (4) | int32 BE exit code |
| `I` — input | uint32 BE length | keystrokes |
| `R` — resize | uint32 BE (4) | uint16 cols, uint16 rows |

### Key design decisions

- **node-pty as PTY layer** — avoids reimplementing PTY/ConPTY on Windows; xterm.js handles rendering.
- **External subprocess for CC** — full session context (history, MCP servers, project config) is preserved across Obsidian restarts.
- **xterm.js theme from CSS variables** — terminal colors follow the active Obsidian theme automatically.
- **Settings-driven `cc` path** — no hardcoded path; works with npm-global, Homebrew, and custom installs.

---

## Development

```bash
# Install dependencies
npm install

# Watch mode (incremental build)
npm run dev

# Type-check + production build
npm run build

# Lint
npm run lint
```

After `npm run dev`, copy `main.js` to your vault's plugin folder and reload Obsidian (no restart needed — *Ctrl+P → Reload app without saving*).

### Code conventions

- TypeScript strict mode; no `any` — use `unknown` + type guards.
- Max 40 lines per function; one responsibility per module.
- Prettier (printWidth 100, singleQuote, semi) + ESLint `@typescript-eslint/recommended`.
- Imports grouped: `obsidian` → external → internal, separated by a blank line.
- Tests: Jest + ts-jest; mock Obsidian API via `__mocks__/obsidian.ts`.

---

## Roadmap

- [ ] macOS / Linux support (PTY proxy already cross-platform; needs packaging)
- [ ] BRAT community plugin listing
- [ ] Multiple simultaneous CC sessions (tab per project)
- [ ] Session persistence across Obsidian restarts

---

## License

MIT © tftdatascientist
