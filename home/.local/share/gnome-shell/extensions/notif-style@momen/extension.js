const { Clutter, GLib } = imports.gi;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;

const HIDE_AFTER = 6;   // seconds a notification stays on screen

let origShow = null;
let origAlign = null;
let hideTimer = 0;

function init() {}

function clearTimer() {
  if (hideTimer) { GLib.source_remove(hideTimer); hideTimer = 0; }
}

function enable() {
  const bin = Main.messageTray._bannerBin;
  origAlign = bin.x_align;
  bin.x_align = Clutter.ActorAlign.END;

  const proto = MessageTray.MessageTray.prototype;
  origShow = proto._showNotification;
  proto._showNotification = function () {
    origShow.call(this);
    try {
      const b = this._bannerBin;
      b.translation_x = (b.width || 360) + 20;
      b.ease({ translation_x: 0, duration: 400, mode: Clutter.AnimationMode.EASE_OUT_CUBIC });
    } catch (e) {
      log(`notif-style: ${e}`);
    }
    // auto-hide after HIDE_AFTER seconds (waits while the pointer is on it)
    clearTimer();
    const tray = this, shown = this._notification;
    hideTimer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, HIDE_AFTER, () => {
      if (tray._notification !== shown) { hideTimer = 0; return GLib.SOURCE_REMOVE; }
      if (tray._pointerInNotification || (tray._banner && tray._banner.focused))
        return GLib.SOURCE_CONTINUE;   // check again shortly
      tray._notificationExpired = true;
      tray._updateState();
      hideTimer = 0;
      return GLib.SOURCE_REMOVE;
    });
  };
}

function disable() {
  clearTimer();
  const bin = Main.messageTray._bannerBin;
  if (origAlign !== null) bin.x_align = origAlign;
  bin.translation_x = 0;
  if (origShow) MessageTray.MessageTray.prototype._showNotification = origShow;
  origShow = null;
  origAlign = null;
}
