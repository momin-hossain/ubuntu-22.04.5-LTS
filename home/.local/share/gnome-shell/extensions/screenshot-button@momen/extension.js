const { St, Gio, GLib, Clutter } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

let button = null;

function init() {}

function enable() {
  button = new PanelMenu.Button(0.0, 'Screenshot', true);
  button.add_child(new St.Icon({ icon_name: 'camera-photo-symbolic', style_class: 'system-status-icon' }));
  button.style = '-natural-hpadding: 1px; -minimum-hpadding: 0px;';
  button.connect('button-press-event', () => {
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
