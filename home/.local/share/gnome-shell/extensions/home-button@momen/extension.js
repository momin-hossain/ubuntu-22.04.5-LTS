const { St, Gio, Meta, Clutter } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

let button = null;
let hidden = [];

function toggle() {
  const ws = global.workspace_manager.get_active_workspace();
  const wins = ws.list_windows().filter(w =>
    w.get_window_type() === Meta.WindowType.NORMAL && !w.is_skip_taskbar());
  const visible = wins.filter(w => !w.minimized);
  if (visible.length > 0) {
    hidden = visible;
    visible.forEach(w => w.minimize());
  } else {
    hidden.forEach(w => { try { w.unminimize(); } catch (e) {} });
    hidden = [];
  }
}

function init() {}

function enable() {
  button = new PanelMenu.Button(0.0, 'Home Button', true);
  const icon = new St.Icon({
    gicon: Gio.ThemedIcon.new_from_names(['distributor-logo-ubuntu', 'ubuntu-logo-icon', 'start-here']),
    style_class: 'home-button-icon', icon_size: 18,
  });
  button.add_child(icon);
  button.connect('button-press-event', () => {
    toggle();
    return Clutter.EVENT_STOP;
  });
  Main.panel.addToStatusArea('home-button@momen', button, 0, 'left');
  Main.panel.statusArea.activities.container.hide();
}

function disable() {
  Main.panel.statusArea.activities.container.show();
  if (button) button.destroy();
  button = null;
  hidden = [];
}
