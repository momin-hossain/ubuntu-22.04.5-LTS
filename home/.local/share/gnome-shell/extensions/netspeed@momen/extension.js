const { St, GLib, Clutter } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const ByteArray = imports.byteArray;

let button = null;
let label = null;
let timer = null;
let prevRx = 0;
let prevTx = 0;
let prevTime = 0;

function readTotals() {
  let rx = 0;
  let tx = 0;
  try {
    const [ok, data] = GLib.file_get_contents('/proc/net/dev');
    if (!ok) return [0, 0];
    ByteArray.toString(data).split('\n').slice(2).forEach(line => {
      const parts = line.trim().split(/[:\s]+/);
      if (parts.length < 10) return;
      const iface = parts[0];
      if (iface === 'lo' || iface.startsWith('docker') || iface.startsWith('veth') || iface.startsWith('br-')) return;
      rx += Number(parts[1]);
      tx += Number(parts[9]);
    });
  } catch (e) {}
  return [rx, tx];
}

function fmt(bytesPerSec) {
  if (bytesPerSec < 1024 * 1024) return `${Math.round(bytesPerSec / 1024)}K`;
  return `${(bytesPerSec / 1048576).toFixed(1)}M`;
}

function update() {
  const now = GLib.get_monotonic_time() / 1e6;
  const [rx, tx] = readTotals();
  if (prevTime && label) {
    const dt = now - prevTime;
    label.text = `↓${fmt(Math.max(0, rx - prevRx) / dt)} ↑${fmt(Math.max(0, tx - prevTx) / dt)}`;
  }
  prevRx = rx;
  prevTx = tx;
  prevTime = now;
  return GLib.SOURCE_CONTINUE;
}

function init() {}

function enable() {
  button = new PanelMenu.Button(0.0, 'Net Speed', true);
  label = new St.Label({ text: '↓0K ↑0K', y_align: Clutter.ActorAlign.CENTER });
  button.add_child(label);
  Main.panel.addToStatusArea('netspeed@momen', button, 0, 'right');
  prevTime = 0;
  update();
  timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, update);
}

function disable() {
  if (timer) GLib.source_remove(timer);
  timer = null;
  if (button) button.destroy();
  button = null;
  label = null;
}
