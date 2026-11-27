const { St, Gio, GLib, Clutter } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

let button = null;

function init() {}

function enable() {
  button = new PanelMenu.Button(0.0, 'Screenshot', true);
  button.add_child(new St.Icon({ icon_name: 'camera-photo-symbolic', style_class: 'system-status-icon' }));
  button.style = '-natural-hpadding: 1px; -minimum-hpadding: 0px;';
  // Fire only on a real left click: pressed AND released on the camera icon.
  // (Firing on press made the area selector catch the rest of that click,
  // or the next click anywhere, as a tiny accidental screenshot.)
  let pressed = false;
  let last = 0;
  button.connect('button-press-event', (_a, ev) => {
    pressed = ev.get_button() === Clutter.BUTTON_PRIMARY;
    return Clutter.EVENT_STOP;
  });
  button.connect('leave-event', () => { pressed = false; return Clutter.EVENT_PROPAGATE; });
  button.connect('button-release-event', (_a, ev) => {
    const ok = pressed && ev.get_button() === Clutter.BUTTON_PRIMARY;
    pressed = false;
    const now = GLib.get_monotonic_time();
    if (!ok || now - last < 1500000) return Clutter.EVENT_STOP;   // ignore double clicks
    last = now;
    try {
      Gio.Subprocess.new([GLib.get_home_dir() + '/.local/bin/snap-annotate'], Gio.SubprocessFlags.NONE);
    } catch (e) { log(`screenshot-button: ${e}`); }
    return Clutter.EVENT_STOP;
  });
  Main.panel.addToStatusArea('screenshot-button@momen', button, 2, 'right');
}

function disable() {
  if (button) button.destroy();
  button = null;
}
