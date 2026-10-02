const { St, GLib, Gio, Clutter } = imports.gi;
const Main = imports.ui.main;
const Cairo = imports.cairo;
const ByteArray = imports.byteArray;

// Edit cities here: [label, timezone]
const CITIES = [
  ['Dhaka', 'Asia/Dhaka'],
  ['Kuala Lumpur', 'Asia/Kuala_Lumpur'],
  ['London', 'Europe/London'],
  ['New York', 'America/New_York'],
];
const SIZE = 72;
const OFFSET_X = 270;

let widget = null;
let areas = [];
let subs = [];
let timer = 0;
let restackId = 0;
let onAC = true;
let count = 0;

function readFile(path) {
  try {
    const [ok, data] = GLib.file_get_contents(path);
    return ok ? ByteArray.toString(data).trim() : '';
  } catch (e) { return ''; }
}

function acOnline() {
  try {
    const base = '/sys/class/power_supply';
    const en = Gio.File.new_for_path(base).enumerate_children('standard::name', 0, null);
    let info;
    while ((info = en.next_file(null))) {
      const n = info.get_name();
      if (readFile(`${base}/${n}/type`) === 'Mains') return readFile(`${base}/${n}/online`) === '1';
    }
  } catch (e) {}
  return true;
}

function tzFor(id) {
  try { const tz = GLib.TimeZone.new_identifier(id); if (tz) return tz; } catch (e) {}
  return GLib.TimeZone.new(id);
}

function drawHand(cr, angle, len, width, r, g, b) {
  cr.save();
  cr.rotate(angle);
  cr.setSourceRGBA(r, g, b, 1);
  cr.setLineWidth(width);
  cr.setLineCap(Cairo.LineCap.ROUND);
  cr.moveTo(0, len * 0.15);
  cr.lineTo(0, -len);
  cr.stroke();
  cr.restore();
}

function paint(area, tz) {
  const cr = area.get_context();
  const [w, h] = area.get_surface_size();
  const rad = Math.min(w, h) / 2 - 2;
  const now = GLib.DateTime.new_now(tz);
  const hr = now.get_hour(), mi = now.get_minute(), se = now.get_second();
  const day = hr >= 6 && hr < 18;
  const fg = day ? [0.1, 0.1, 0.12] : [0.96, 0.96, 0.96];

  cr.translate(w / 2, h / 2);
  cr.arc(0, 0, rad, 0, 2 * Math.PI);
  if (day) cr.setSourceRGBA(0.97, 0.97, 0.97, 1); else cr.setSourceRGBA(0.11, 0.11, 0.13, 1);
  cr.fill();

  for (let i = 0; i < 12; i++) {
    cr.save();
    cr.rotate(i * Math.PI / 6);
    cr.setSourceRGBA(fg[0], fg[1], fg[2], i % 3 === 0 ? 0.9 : 0.45);
    cr.setLineWidth(i % 3 === 0 ? 2 : 1.2);
    cr.moveTo(0, -rad + 4);
    cr.lineTo(0, -rad + (i % 3 === 0 ? 10 : 7));
    cr.stroke();
    cr.restore();
  }

  const minAngle = onAC ? (mi + se / 60) * Math.PI / 30 : mi * Math.PI / 30;
  drawHand(cr, ((hr % 12) + mi / 60) * Math.PI / 6, rad * 0.5, 3, fg[0], fg[1], fg[2]);
  drawHand(cr, minAngle, rad * 0.75, 2, fg[0], fg[1], fg[2]);
  if (onAC) drawHand(cr, se * Math.PI / 30, rad * 0.8, 1, 1.0, 0.58, 0.0);

  cr.arc(0, 0, 2.5, 0, 2 * Math.PI);
  cr.setSourceRGBA(1.0, 0.58, 0.0, 1);
  cr.fill();
  cr.$dispose();
}

function subText(tz) {
  const here = GLib.DateTime.new_now_local();
  const there = GLib.DateTime.new_now(tz);
  const diffH = Math.round((there.get_utc_offset() - here.get_utc_offset()) / 3.6e9 * 10) / 10;
  const dd = there.get_day_of_year() - here.get_day_of_year();
  const dayWord = dd === 0 ? 'Today' : (dd > 0 || dd < -300) ? 'Tomorrow' : 'Yesterday';
  return `${dayWord}, ${diffH >= 0 ? '+' : ''}${diffH}h`;
}

function build() {
  widget = new St.BoxLayout({
    style: 'background-color: rgba(18,18,22,0.62); border-radius: 18px; padding: 14px 16px; spacing: 16px;',
  });
  CITIES.forEach(([name, id]) => {
    const tz = tzFor(id);
    const col = new St.BoxLayout({ vertical: true, style: 'spacing: 4px;' });
    const area = new St.DrawingArea({ width: SIZE, height: SIZE });
    area.connect('repaint', a => paint(a, tz));
    col.add_child(area);
    col.add_child(new St.Label({ text: name, x_align: Clutter.ActorAlign.CENTER, style: 'font-size: 12px; font-weight: bold; color: #fff;' }));
    const subL = new St.Label({ text: subText(tz), x_align: Clutter.ActorAlign.CENTER, style: 'font-size: 10px; color: rgba(255,255,255,0.65);' });
    col.add_child(subL);
    widget.add_child(col);
    areas.push(area);
    subs.push([subL, tz]);
  });
}

function place() {
  if (!widget) return;
  const mon = Main.layoutManager.primaryMonitor;
  widget.set_position(mon.x + OFFSET_X, mon.y + Main.panel.height + 40);
  const group = global.window_group;
  if (widget.get_parent() !== group) group.add_child(widget);
  let desktop = null;
  for (const a of global.get_window_actors()) {
    const t = a.meta_window ? a.meta_window.get_title() : '';
    if (t && t.startsWith('@!')) desktop = a;
  }
  if (desktop) group.set_child_above_sibling(widget, desktop);
  else group.set_child_above_sibling(widget, Main.layoutManager._backgroundGroup);
}

function refresh() {
  areas.forEach(a => a.queue_repaint());
  subs.forEach(([l, tz]) => { l.text = subText(tz); });
}

function tick() {
  const was = onAC;
  onAC = acOnline();
  count++;
  if (onAC || onAC !== was || count % 30 === 0) refresh();
  return GLib.SOURCE_CONTINUE;
}

function init() {}

function enable() {
  onAC = acOnline();
  build();
  place();
  restackId = global.display.connect('restacked', place);
  timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, tick);
}

function disable() {
  if (timer) GLib.source_remove(timer);
  timer = 0;
  if (restackId) global.display.disconnect(restackId);
  restackId = 0;
  if (widget) widget.destroy();
  widget = null;
  areas = [];
  subs = [];
}
