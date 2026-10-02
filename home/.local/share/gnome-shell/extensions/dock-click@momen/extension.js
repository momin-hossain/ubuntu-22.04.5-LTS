const { Clutter, GLib, Meta } = imports.gi;
const Main = imports.ui.main;

let proto = null;
let origActivate = null;
let timer = 0;

function findProto() {
  const dock = Main.extensionManager.lookup('ubuntu-dock@ubuntu.com') ||
               Main.extensionManager.lookup('dash-to-dock@micxgx.gmail.com');
  if (!dock || !dock.imports || !dock.imports.appIcons) return null;
  const m = dock.imports.appIcons;
  for (const n of ['DockAbstractAppIcon', 'DockAppIcon', 'MyAppIcon']) {
    if (m[n] && m[n].prototype && m[n].prototype.activate) return m[n].prototype;
  }
  return null;
}

function windowsOf(icon) {
  let wins = [];
  try {
    wins = icon.getInterestingWindows ? icon.getInterestingWindows() : icon.app.get_windows();
  } catch (e) {
    wins = icon.app.get_windows();
  }
  return wins.filter(w => !w.skip_taskbar && w.get_window_type() === Meta.WindowType.NORMAL);
}

function patch() {
  proto = findProto();
  if (!proto) return false;
  origActivate = proto.activate;
  proto.activate = function (button) {
    try {
      const ev = Clutter.get_current_event();
      const mods = ev ? ev.get_state() : 0;
      const plain = !(mods & (Clutter.ModifierType.CONTROL_MASK | Clutter.ModifierType.SHIFT_MASK));
      const wins = windowsOf(this);
      const focused = global.display.focus_window;
      if ((button === 1 || button === undefined) && plain && wins.length === 1 &&
          focused && wins[0] === focused && !wins[0].minimized) {
        wins[0].minimize();
        return;
      }
    } catch (e) {
      log(`dock-click: ${e}`);
    }
    return origActivate.call(this, button);
  };
  return true;
}

function init() {}

function enable() {
  if (!patch()) {
    let tries = 0;
    timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
      tries++;
      if (patch() || tries >= 15) { timer = 0; return GLib.SOURCE_REMOVE; }
      return GLib.SOURCE_CONTINUE;
    });
  }
}

function disable() {
  if (timer) GLib.source_remove(timer);
  timer = 0;
  if (proto && origActivate) proto.activate = origActivate;
  proto = null;
  origActivate = null;
}
