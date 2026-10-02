const { GLib, Meta } = imports.gi;

const APPS = ['code', 'google-chrome'];   // window classes to maximize (lowercase)

let sig = 0;

function init() {}

function enable() {
  sig = global.display.connect('window-created', (display, win) => {
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
      try {
        const cls = (win.get_wm_class() || '').toLowerCase();
        if (APPS.includes(cls) && win.get_window_type() === Meta.WindowType.NORMAL && win.can_maximize())
          win.maximize(Meta.MaximizeFlags.BOTH);
      } catch (e) {
        log(`auto-maximize: ${e}`);
      }
      return GLib.SOURCE_REMOVE;
    });
  });
}

function disable() {
  if (sig) global.display.disconnect(sig);
  sig = 0;
}
