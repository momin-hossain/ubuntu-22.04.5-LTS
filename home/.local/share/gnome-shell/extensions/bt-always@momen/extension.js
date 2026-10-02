// Keep Bluetooth in the system menu even when it is off
const Main = imports.ui.main;
let item = null, id = 0;
function init() {}
function enable() {
    const bt = Main.panel.statusArea.aggregateMenu._bluetooth;
    if (!bt || !bt._item) return;
    item = bt._item;
    id = item.connect('notify::visible', () => { if (!item.visible) item.show(); });
    item.show();
}
function disable() {
    if (item && id) item.disconnect(id);
    item = null; id = 0;
}
