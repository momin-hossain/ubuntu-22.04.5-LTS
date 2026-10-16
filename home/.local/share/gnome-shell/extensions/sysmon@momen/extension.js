// CPU + RAM % in the top bar, right after the language (en/bn) switch
const { St, GLib, Clutter } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const ByteArray = imports.byteArray;

let btn = null, label = null, timer = 0, prev = null;

function read(p) {
    try { const [ok, c] = GLib.file_get_contents(p); return ok ? ByteArray.toString(c) : ''; }
    catch (e) { return ''; }
}

function cpu() {
    const f = read('/proc/stat').split('\n')[0].trim().split(/\s+/).slice(1).map(Number);
    const idle = f[3] + (f[4] || 0), total = f.reduce((a, b) => a + b, 0);
    let pct = 0;
    if (prev) { const dt = total - prev.t, di = idle - prev.i; pct = dt > 0 ? Math.round(100 * (1 - di / dt)) : 0; }
    prev = { t: total, i: idle };
    return Math.max(0, Math.min(100, pct));
}

function ram() {
    const m = read('/proc/meminfo');
    const g = k => { const r = m.match(new RegExp('^' + k + ':\\s+(\\d+)', 'm')); return r ? Number(r[1]) : 0; };
    const t = g('MemTotal'), a = g('MemAvailable');
    return t ? Math.round(100 * (t - a) / t) : 0;
}

const color = v => '#ffffff';

function update() {
    if (!label) return;
    const c = cpu(), r = ram();
    label.clutter_text.set_markup(
        `<span>CPU</span> <span foreground="${color(c)}">${String(c).padStart(2, ' ')}%</span>` +
        `   <span>RAM</span> <span foreground="${color(r)}">${r}%</span>`);
}

function init() {}

function enable() {
    btn = new PanelMenu.Button(0.0, 'sysmon', true);
    label = new St.Label({ y_align: Clutter.ActorAlign.CENTER,
        style: 'font-feature-settings: "tnum"; min-width: 9.4em; text-align: center;' });
    btn.add_child(label);
    btn.connect('button-press-event', () => {
        GLib.spawn_command_line_async('gnome-system-monitor -r');
        return Clutter.EVENT_STOP;
    });

    // place right after the keyboard / language indicator
    let idx = 0;
    const lb = Main.panel._leftBox.get_children();
    const am = Main.panel.statusArea.appMenu;
    const i = am ? lb.indexOf(am.container) : -1;
    idx = i >= 0 ? i + 1 : lb.length;
    Main.panel.addToStatusArea('sysmon@momen', btn, idx, 'left');

    update();
    timer = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, 2, () => { update(); return GLib.SOURCE_CONTINUE; });
}

function disable() {
    if (timer) { GLib.source_remove(timer); timer = 0; }
    if (btn) { btn.destroy(); btn = null; }
    label = null; prev = null;
}
