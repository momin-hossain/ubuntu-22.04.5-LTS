const { St, GLib, Gio } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const SERVICES = [
  { key: 'apache', name: 'Apache', check: 'pgrep -f "/opt/lampp/bin/[h]ttpd"',
    start: ['sudo', '-n', '/opt/lampp/lampp', 'startapache'], stop: ['sudo', '-n', '/opt/lampp/lampp', 'stopapache'] },
  { key: 'mysql', name: 'MySQL', check: 'pgrep -f "/opt/lampp/sbin/[m]ysqld"',
    start: ['sudo', '-n', '/opt/lampp/lampp', 'startmysql'], stop: ['sudo', '-n', '/opt/lampp/lampp', 'stopmysql'] },
];

let button = null;
let icon = null;
let items = {};
let timer = 0;

function run(argv, cb) {
  try {
    const p = Gio.Subprocess.new(argv, Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
    p.communicate_utf8_async(null, null, (proc, res) => {
      let out = '', ok = false;
      try { const [, o] = proc.communicate_utf8_finish(res); out = o || ''; ok = proc.get_successful(); } catch (e) {}
      if (cb) cb(ok, out);
    });
  } catch (e) { if (cb) cb(false, ''); }
}

function setLabel(item, name, on) {
  item.label.clutter_text.set_markup(`<span foreground="${on ? '#4caf50' : '#888888'}">●</span>  ${name}`);
}

function refresh() {
  const script = SERVICES.map(s => `${s.check} >/dev/null && echo 1 || echo 0`).join('; ');
  run(['sh', '-c', script], (ok, out) => {
    if (!button) return;
    const states = out.trim().split('\n');
    let any = false;
    SERVICES.forEach((s, i) => {
      const on = states[i] === '1';
      any = any || on;
      const it = items[s.key];
      if (it) { it.setToggleState(on); setLabel(it, s.name, on); }
    });
    icon.style = any ? 'color: #4caf50;' : '';
  });
  return GLib.SOURCE_CONTINUE;
}

function init() {}

function enable() {
  button = new PanelMenu.Button(0.0, 'Dev Services');
  icon = new St.Icon({ icon_name: 'network-server-symbolic', style_class: 'system-status-icon' });
  button.add_child(icon);

  SERVICES.forEach(s => {
    const it = new PopupMenu.PopupSwitchMenuItem(s.name, false);
    it.activate = function () { if (this._switch.mapped) this.toggle(); };
    setLabel(it, s.name, false);
    it.connect('toggled', (item, state) => {
      setLabel(item, s.name, state);
      run(state ? s.start : s.stop, ok => {
        if (!ok) Main.notify('Dev Services', `Could not ${state ? 'start' : 'stop'} ${s.name}`);
        GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 4, () => { refresh(); return GLib.SOURCE_REMOVE; });
      });
    });
    items[s.key] = it;
    button.menu.addMenuItem(it);
  });

  button.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
  [['Open phpMyAdmin', ['xdg-open', 'http://localhost/phpmyadmin']],
   ['Open htdocs', ['xdg-open', '/opt/lampp/htdocs']]].forEach(([label, argv]) => {
    const it = new PopupMenu.PopupMenuItem(label);
    it.connect('activate', () => run(argv));
    button.menu.addMenuItem(it);
  });

  button.menu.connect('open-state-changed', (m, open) => { if (open) refresh(); });
  Main.panel.addToStatusArea('dev-services@momen', button, 1, 'right');
  refresh();
  timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, refresh);
}

function disable() {
  if (timer) GLib.source_remove(timer);
  timer = 0;
  if (button) button.destroy();
  button = null;
  icon = null;
  items = {};
}
