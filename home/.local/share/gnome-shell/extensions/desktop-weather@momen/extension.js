const { St, GLib, Gio } = imports.gi;
const Main = imports.ui.main;

const CITY = 'Gazipur';
const OFFSET_X = 32;
const OFFSET_Y = 40;
const REFRESH_MIN = 30;

let widget = null;
let iconEl = null;
let tempEl = null;
let descEl = null;
let detailEl = null;
let forecastBox = null;
let expanded = false;
let restackId = 0;
let timer = null;
let cancellable = null;

function iconFor(desc) {
  const d = (desc || '').toLowerCase();
  if (d.includes('thunder')) return 'weather-storm-symbolic';
  if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) return 'weather-showers-symbolic';
  if (d.includes('snow')) return 'weather-snow-symbolic';
  if (d.includes('fog') || d.includes('mist') || d.includes('haze')) return 'weather-fog-symbolic';
  if (d.includes('partly')) return 'weather-few-clouds-symbolic';
  if (d.includes('cloud') || d.includes('overcast')) return 'weather-overcast-symbolic';
  return 'weather-clear-symbolic';
}

function makeLabel(text, style) {
  return new St.Label({ text, style });
}

function build() {
  widget = new St.Button({
    reactive: true,
    track_hover: true,
    style: 'background-color: rgba(18,18,22,0.62); border-radius: 18px; padding: 16px 18px;',
  });
  const col = new St.BoxLayout({ vertical: true, style: 'spacing: 6px; min-width: 190px;' });
  const row = new St.BoxLayout({ style: 'spacing: 12px;' });
  iconEl = new St.Icon({ icon_name: 'weather-clear-symbolic', icon_size: 40, style: 'color: #fff;' });
  const right = new St.BoxLayout({ vertical: true });
  tempEl = makeLabel('--°', 'font-size: 30px; font-weight: bold; color: #fff;');
  right.add_child(tempEl);
  right.add_child(makeLabel(CITY, 'font-size: 12px; color: rgba(255,255,255,0.75);'));
  row.add_child(iconEl);
  row.add_child(right);
  descEl = makeLabel('Loading...', 'font-size: 13px; color: #fff;');
  detailEl = makeLabel('', 'font-size: 11px; color: rgba(255,255,255,0.7);');
  forecastBox = new St.BoxLayout({ vertical: true, style: 'spacing: 5px; padding-top: 8px;' });
  forecastBox.visible = false;
  col.add_child(row);
  col.add_child(descEl);
  col.add_child(detailEl);
  col.add_child(forecastBox);
  widget.set_child(col);
  widget.connect('clicked', () => {
    expanded = !expanded;
    forecastBox.visible = expanded;
  });
}

function render(j) {
  if (!widget) return;
  const c = j.current_condition[0];
  const desc = c.weatherDesc[0].value.trim();
  tempEl.text = `${c.temp_C}°`;
  descEl.text = desc;
  iconEl.icon_name = iconFor(desc);
  detailEl.text = `Feels ${c.FeelsLikeC}°  ·  Humidity ${c.humidity}%`;
  forecastBox.destroy_all_children();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  j.weather.slice(0, 3).forEach((d, i) => {
    const dt = new Date(`${d.date}T00:00:00`);
    const name = i === 0 ? 'Today' : days[dt.getDay()];
    const h = d.hourly[4] || d.hourly[0];
    const r = new St.BoxLayout({ style: 'spacing: 10px;' });
    r.add_child(new St.Icon({ icon_name: iconFor(h.weatherDesc[0].value), icon_size: 16, style: 'color: #fff;' }));
    r.add_child(makeLabel(name, 'font-size: 12px; color: #fff; min-width: 48px;'));
    r.add_child(makeLabel(`${d.mintempC}° / ${d.maxtempC}°`, 'font-size: 12px; color: rgba(255,255,255,0.85);'));
    forecastBox.add_child(r);
  });
}

function fetchWeather() {
  try {
    cancellable = new Gio.Cancellable();
    const proc = Gio.Subprocess.new(
      ['curl', '-s', '--max-time', '15', `https://wttr.in/${CITY}?format=j1`],
      Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE
    );
    proc.communicate_utf8_async(null, cancellable, (p, res) => {
      try {
        const [, out] = p.communicate_utf8_finish(res);
        render(JSON.parse(out));
      } catch (e) {
        if (descEl) descEl.text = 'Weather unavailable';
      }
    });
  } catch (e) {
    if (descEl) descEl.text = 'Weather unavailable';
  }
  return GLib.SOURCE_CONTINUE;
}

function place() {
  if (!widget) return;
  const mon = Main.layoutManager.primaryMonitor;
  widget.set_position(mon.x + OFFSET_X, mon.y + Main.panel.height + OFFSET_Y);
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

function init() {}

function enable() {
  build();
  place();
  restackId = global.display.connect('restacked', place);
  fetchWeather();
  timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, REFRESH_MIN * 60, fetchWeather);
}

function disable() {
  if (timer) GLib.source_remove(timer);
  timer = null;
  if (restackId) global.display.disconnect(restackId);
  restackId = 0;
  if (cancellable) cancellable.cancel();
  cancellable = null;
  if (widget) widget.destroy();
  widget = null;
  expanded = false;
}
