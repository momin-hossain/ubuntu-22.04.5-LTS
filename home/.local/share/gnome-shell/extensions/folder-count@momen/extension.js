// Folder Count - while a Files (Nautilus) window is in front, the top bar
// shows how many items its folder has ("📁 648 items"), like the status bar
// in Windows Explorer. Hidden files are not counted (Files hides them too).
// Files tells us each window's folder over D-Bus (OpenWindowsWithLocations,
// keyed by the window's object path); the count updates when you change
// folder, switch window, or files are added / removed.
const { St, GLib, Gio, Clutter } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

let button = null;
let label = null;
let proxy = null;
let proxySignal = 0;
let focusSignal = 0;
let monitor = null;
let monitorSignal = 0;
let monitoredUri = null;
let recountTimer = 0;
let cancellable = null;
let ownerSignal = 0;
let enableToken = null;

function isFiles(win) {
  const cls = (win && win.get_wm_class()) || '';
  return cls.toLowerCase() === 'org.gnome.nautilus';
}

// The folder (URI) shown in the focused Files window, or null.
function currentUri() {
  const win = global.display.focus_window;
  if (!isFiles(win) || !proxy) return null;
  const value = proxy.get_cached_property('OpenWindowsWithLocations');
  if (!value) return null;
  const byWindow = value.deep_unpack();
  const locations = byWindow[win.get_gtk_window_object_path()];
  return locations && locations.length ? locations[0] : null;
}

function show(text) {
  if (!label) return;
  label.text = text;
  button.visible = true;
}

function hide() {
  if (button) button.visible = false;
}

function stopMonitor() {
  if (monitor) {
    monitor.disconnect(monitorSignal);
    monitor.cancel();
  }
  monitor = null;
  monitorSignal = 0;
  monitoredUri = null;
}

// Count the visible entries of `file` (async, in batches).
function count(file) {
  if (cancellable) cancellable.cancel();
  cancellable = new Gio.Cancellable();
  const myCancel = cancellable;
  let n = 0;
  file.enumerate_children_async('standard::name,standard::is-hidden,standard::is-backup',
    Gio.FileQueryInfoFlags.NONE, GLib.PRIORITY_LOW, myCancel, (f, res) => {
      let en;
      try {
        en = f.enumerate_children_finish(res);
      } catch (e) {
        if (!myCancel.is_cancelled()) hide();
        return;
      }
      const next = () => {
        en.next_files_async(500, GLib.PRIORITY_LOW, myCancel, (e2, res2) => {
          let infos;
          try {
            infos = en.next_files_finish(res2);
          } catch (err) {
            return;
          }
          if (infos.length === 0) {
            en.close_async(GLib.PRIORITY_LOW, null, null);
            if (!myCancel.is_cancelled()) show(`📁 ${n.toLocaleString()} item${n === 1 ? '' : 's'}`);
            return;
          }
          for (const info of infos) {
            if (!info.get_is_hidden() && !info.get_is_backup()) n++;
          }
          next();
        });
      };
      next();
    });
}

function update() {
  const uri = currentUri();
  if (!uri || !uri.startsWith('file://')) {
    stopMonitor();
    hide();
    return;
  }
  const file = Gio.File.new_for_uri(uri);
  if (uri !== monitoredUri) {
    stopMonitor();
    try {
      monitor = file.monitor_directory(Gio.FileMonitorFlags.WATCH_MOVES, null);
      monitorSignal = monitor.connect('changed', scheduleRecount);
      monitoredUri = uri;
    } catch (e) {}
  }
  count(file);
}

// Many changes at once (a download, a paste) -> one recount.
function scheduleRecount() {
  if (recountTimer) return;
  recountTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
    recountTimer = 0;
    update();
    return GLib.SOURCE_REMOVE;
  });
}

function init() {}

function enable() {
  button = new PanelMenu.Button(0.0, 'Folder Count', true);
  label = new St.Label({ text: '', y_align: Clutter.ActorAlign.CENTER });
  button.add_child(label);
  button.visible = false;
  Main.panel.addToStatusArea('folder-count@momen', button, 0, 'right');

  // Never block the desktop: connect in the background, and never start
  // Files ourselves (DO_NOT_AUTO_START) - a blocking connect at login, while
  // Files wasn't running, froze the shell until it timed out (~25 s).
  // The proxy picks Files up whenever it starts (g-name-owner).
  const token = {};
  enableToken = token;
  Gio.DBusProxy.new_for_bus(Gio.BusType.SESSION, Gio.DBusProxyFlags.DO_NOT_AUTO_START, null,
    'org.freedesktop.FileManager1', '/org/freedesktop/FileManager1', 'org.freedesktop.FileManager1',
    null, (src, res) => {
      let p;
      try {
        p = Gio.DBusProxy.new_for_bus_finish(res);
      } catch (e) {
        return;
      }
      if (enableToken !== token) return; // disabled meanwhile
      proxy = p;
      proxySignal = proxy.connect('g-properties-changed', scheduleRecount);
      ownerSignal = proxy.connect('notify::g-name-owner', scheduleRecount);
      update();
    });
  focusSignal = global.display.connect('notify::focus-window', update);
}

function disable() {
  if (focusSignal) global.display.disconnect(focusSignal);
  focusSignal = 0;
  enableToken = null;
  if (proxy && proxySignal) proxy.disconnect(proxySignal);
  if (proxy && ownerSignal) proxy.disconnect(ownerSignal);
  proxySignal = 0;
  ownerSignal = 0;
  proxy = null;
  if (recountTimer) GLib.source_remove(recountTimer);
  recountTimer = 0;
  if (cancellable) cancellable.cancel();
  cancellable = null;
  stopMonitor();
  if (button) button.destroy();
  button = null;
  label = null;
}
