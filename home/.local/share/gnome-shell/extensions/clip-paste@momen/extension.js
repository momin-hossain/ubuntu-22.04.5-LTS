// Paste on select for Clipboard Indicator (Super+V)
const { St, Clutter, GLib } = imports.gi;
const Main = imports.ui.main;

let ind = null, menuId = 0, extId = 0, timer = 0, startT = 0, before = null, vk = null;

function findInd() {
    const sa = Main.panel.statusArea;
    if (sa.clipboardIndicator) return sa.clipboardIndicator;
    for (const k in sa) if (/clipboard/i.test(k)) return sa[k];
    return null;
}

function unbind() {
    if (ind && menuId) { try { ind.menu.disconnect(menuId); } catch (e) {} }
    ind = null; menuId = 0;
}

function paste() {
    if (!vk) vk = Clutter.get_default_backend().get_default_seat()
        .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
    const w = global.display.focus_window;
    const term = w && /terminal|tilix|kitty|alacritty|konsole|terminator/i.test(w.get_wm_class() || '');
    const keys = term ? [Clutter.KEY_Control_L, Clutter.KEY_Shift_L, Clutter.KEY_v]
                      : [Clutter.KEY_Control_L, Clutter.KEY_v];
    const t = GLib.get_monotonic_time();
    keys.forEach(k => vk.notify_keyval(t, k, Clutter.KeyState.PRESSED));
    keys.slice().reverse().forEach(k => vk.notify_keyval(t, k, Clutter.KeyState.RELEASED));
}

function bind() {
    const i = findInd();
    if (i === ind) return;
    unbind();
    if (!i || !i.menu) return;
    ind = i;
    const cb = St.Clipboard.get_default();
    menuId = ind.menu.connect('open-state-changed', (m, open) => {
        if (open) {
            before = null;
            cb.get_text(St.ClipboardType.CLIPBOARD, (c, t) => { before = t; });
            return;
        }
        if (timer) GLib.source_remove(timer);
        timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 180, () => {
            timer = 0;
            cb.get_text(St.ClipboardType.CLIPBOARD, (c, t) => {
                if (t && t !== before) paste();
            });
            return GLib.SOURCE_REMOVE;
        });
    });
}

function init() {}

function enable() {
    bind();
    extId = Main.extensionManager.connect('extension-state-changed', () => bind());
    startT = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3, () => { startT = 0; bind(); return GLib.SOURCE_REMOVE; });
}

function disable() {
    if (extId) { Main.extensionManager.disconnect(extId); extId = 0; }
    if (timer) { GLib.source_remove(timer); timer = 0; }
    if (startT) { GLib.source_remove(startT); startT = 0; }
    unbind();
    vk = null;
}
