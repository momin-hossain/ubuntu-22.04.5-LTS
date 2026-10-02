const { Clutter } = imports.gi;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;

let origShow = null;
let origAlign = null;

function init() {}

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
  };
}

function disable() {
  const bin = Main.messageTray._bannerBin;
  if (origAlign !== null) bin.x_align = origAlign;
  bin.translation_x = 0;
  if (origShow) MessageTray.MessageTray.prototype._showNotification = origShow;
  origShow = null;
  origAlign = null;
}
