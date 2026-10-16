// Earbud battery % in the top bar while a Bluetooth audio device is connected
const { St, Gio, GLib, Clutter } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

let btn = null, label = null, icon = null, poll = 0, debounce = 0, sigs = [];

function update() {
    Gio.DBus.system.call('org.bluez', '/', 'org.freedesktop.DBus.ObjectManager', 'GetManagedObjects',
        null, null, Gio.DBusCallFlags.NONE, -1, null, (conn, res) => {
            let pct = null;
            try {
                const [objs] = conn.call_finish(res).recursiveUnpack();
                for (const path in objs) {
                    const dev = objs[path]['org.bluez.Device1'], bat = objs[path]['org.bluez.Battery1'];
                    if (dev && bat && dev.Connected) { pct = bat.Percentage; break; }
                }
            } catch (e) {}
            if (!btn) return;
            if (pct === null) { btn.hide(); return; }
            label.text = `${pct}%`;
            label.style = pct <= 20 ? 'color: #ff6b6b;' : '';
            btn.show();
        });
}

function soon() {
    if (debounce) return;
    debounce = GLib.timeout_add(GLib.PRIORITY_LOW, 1500, () => { debounce = 0; update(); return GLib.SOURCE_REMOVE; });
}

function init() {}

function enable() {
    btn = new PanelMenu.Button(0.0, 'earbuds', true);
    const box = new St.BoxLayout({ style: 'spacing: 4px;' });
    icon = new St.Icon({ icon_name: 'audio-headphones-symbolic', style_class: 'system-status-icon' });
    label = new St.Label({ text: '', y_align: Clutter.ActorAlign.CENTER, style: 'font-feature-settings: "tnum";' });
    box.add_child(icon); box.add_child(label);
    btn.add_child(box);
    btn.connect('button-press-event', () => { GLib.spawn_command_line_async('gnome-control-center bluetooth'); return Clutter.EVENT_STOP; });

    let idx = 0;
    const kb = Main.panel.statusArea.keyboard;
    if (kb) { const i = Main.panel._rightBox.get_children().indexOf(kb.container); if (i >= 0) idx = i + 1; }
    Main.panel.addToStatusArea('earbuds@momen', btn, idx, 'right');
    btn.hide();

    const sub = (iface, member) => Gio.DBus.system.signal_subscribe('org.bluez', iface, member, null, null,
        Gio.DBusSignalFlags.NONE, () => soon());
    sigs = [sub('org.freedesktop.DBus.Properties', 'PropertiesChanged'),
            sub('org.freedesktop.DBus.ObjectManager', 'InterfacesAdded'),
            sub('org.freedesktop.DBus.ObjectManager', 'InterfacesRemoved')];
    update();
    poll = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, 60, () => { update(); return GLib.SOURCE_CONTINUE; });
}

function disable() {
    sigs.forEach(id => Gio.DBus.system.signal_unsubscribe(id)); sigs = [];
    if (poll) { GLib.source_remove(poll); poll = 0; }
    if (debounce) { GLib.source_remove(debounce); debounce = 0; }
    if (btn) { btn.destroy(); btn = null; }
    label = icon = null;
}
