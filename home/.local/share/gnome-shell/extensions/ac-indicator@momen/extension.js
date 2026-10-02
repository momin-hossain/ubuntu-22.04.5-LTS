const { St, GLib, Gio } = imports.gi;
const Main = imports.ui.main;
const ByteArray = imports.byteArray;

let timer = null;
let propId = 0;
let power = null;
let plug = null;

function readFile(path) {
  try {
    const [ok, data] = GLib.file_get_contents(path);
    return ok ? ByteArray.toString(data).trim() : '';
  } catch (e) {
    return '';
  }
}

function acOnline() {
  try {
    const base = '/sys/class/power_supply';
    const en = Gio.File.new_for_path(base).enumerate_children('standard::name', 0, null);
    let info;
    while ((info = en.next_file(null))) {
      const name = info.get_name();
      if (readFile(`${base}/${name}/type`) === 'Mains' && readFile(`${base}/${name}/online`) === '1')
        return true;
    }
  } catch (e) {}
  return false;
}

function apply() {
  try {
    const ac = acOnline();
    if (plug) {
      plug.visible = ac;
      return GLib.SOURCE_CONTINUE;
    }
    if (!power || !power._proxy || !power._indicator) return GLib.SOURCE_CONTINUE;
    if (ac) {
      const pct = power._proxy.Percentage || 0;
      const lvl = Math.min(100, 10 * Math.floor(pct / 10));
      const name = (power._proxy.State === 1 && pct < 99) ? (lvl >= 100 ? 'battery-level-100-charging-symbolic' : `battery-level-${lvl}-charging-symbolic`) : `battery-plugged-${lvl}-symbolic`;
      power._indicator.gicon = new Gio.ThemedIcon({ name });
    }
  } catch (e) {
    log(`ac-indicator: ${e}`);
  }
  return GLib.SOURCE_CONTINUE;
}

function init() {}

function enable() {
  power = Main.panel.statusArea.aggregateMenu ? Main.panel.statusArea.aggregateMenu._power : null;
  if (power && power._proxy && power._indicator) {
    propId = power._proxy.connect('g-properties-changed', () => apply());
  } else {
    plug = new St.Icon({ icon_name: 'ac-adapter-symbolic', style_class: 'system-status-icon' });
    Main.panel.statusArea.aggregateMenu._indicators.insert_child_at_index(plug, 0);
  }
  apply();
  timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, apply);
}

function disable() {
  if (timer) GLib.source_remove(timer);
  timer = null;
  if (power && propId) power._proxy.disconnect(propId);
  propId = 0;
  if (power && power._sync) power._sync();
  power = null;
  if (plug) plug.destroy();
  plug = null;
}
