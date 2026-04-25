/**
 * PTY proxy — runs in a real Node.js process (not Electron renderer).
 * Spawns the target command via @lydell/node-pty and bridges I/O with
 * the parent Obsidian process over stdin/stdout.
 *
 * Args: node pty-proxy.js <ptyModulePath> <command> <cwd> <cols> <rows> [extraArgs...]
 *
 * Protocol (stdout → parent):
 *   'D' + uint32BE(len) + data   terminal output
 *   'X' + int32BE(code)          process exited
 *
 * Protocol (stdin ← parent):
 *   'I' + uint32BE(len) + data   keyboard input
 *   'R' + uint16BE(cols) + uint16BE(rows)  resize
 */

const [,, ptyModulePath, command, cwd, colsStr, rowsStr, ...extraArgs] = process.argv;
const cols = parseInt(colsStr, 10) || 80;
const rows = parseInt(rowsStr, 10) || 24;

let pty;
try {
  const nodePty = require(ptyModulePath);
  pty = nodePty.spawn(command, extraArgs, {
    name: 'xterm-256color',
    cols, rows, cwd,
    env: { ...process.env, COLORTERM: 'truecolor' },
  });
} catch (e) {
  process.stderr.write('PTY spawn error: ' + e.message + '\n');
  process.exit(1);
}

function send(type, payload) {
  const header = Buffer.alloc(5);
  header[0] = type.charCodeAt(0);
  header.writeUInt32BE(payload.length, 1);
  process.stdout.write(header);
  process.stdout.write(payload);
}

pty.onData(data => {
  send('D', Buffer.from(data));
});

pty.onExit(({ exitCode }) => {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(exitCode ?? 0);
  const header = Buffer.alloc(1);
  header[0] = 'X'.charCodeAt(0);
  process.stdout.write(Buffer.concat([header, buf]));
  process.exit(0);
});

// Read framed messages from parent
let buf = Buffer.alloc(0);
process.stdin.on('data', chunk => {
  buf = Buffer.concat([buf, chunk]);
  while (buf.length >= 5) {
    const type = String.fromCharCode(buf[0]);
    const len = buf.readUInt32BE(1);
    if (buf.length < 5 + len) break;
    const payload = buf.slice(5, 5 + len);
    buf = buf.slice(5 + len);

    if (type === 'I') {
      pty.write(payload.toString());
    } else if (type === 'R' && payload.length >= 4) {
      const c = payload.readUInt16BE(0);
      const r = payload.readUInt16BE(2);
      pty.resize(c, r);
    }
  }
});

process.stdin.on('end', () => {
  pty.kill();
  process.exit(0);
});
