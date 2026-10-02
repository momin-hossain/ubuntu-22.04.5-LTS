const { GLib, St } = imports.gi;
const Main = imports.ui.main;

// Left-to-right order at the start of the right side of the top bar
const ORDER = ['netspeed@momen', 'screenshot-button@momen', 'dev-services@momen', 'keyboard'];
const ITEM_STYLE = '-natural-hpadding: 8px; -minimum-hpadding: 8px;';
const INNER_STYLE = 'padding: 0; margin: 0;';
const SPEED_STYLE = 'padding: 0; margin: 0; font-feature-settings: "tnum"; min-width: 5.6em; text-align: center;';
const BN_FONT = 'Noto Sans Bengali';
const MONTHS = ['বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'];

let origEnter = null;
let blocked = [];
let timer = 0;
let hidden = [];
let styled = [];
let clock = null;
let clockSig = 0;
let clockBusy = false;

function banglaDate(now) {
  const y = now.getFullYear();
  const utc = (Y, M, D) => Date.UTC(Y, M, D);
  const today = utc(y, now.getMonth(), now.getDate());
  const startY = today < utc(y, 3, 14) ? y - 1 : y;
  let days = Math.round((today - utc(startY, 3, 14)) / 86400000);
  const g = startY + 1;
  const leap = (g % 4 === 0 && g % 100 !== 0) || g % 400 === 0;
  const lens = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, leap ? 30 : 29, 30];
  let m = 0;
  while (m < 11 && days >= lens[m]) { days -= lens[m]; m++; }
  const bn = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  return `${bn(days + 1)} ${MONTHS[m]} ${bn(startY - 593)}`;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function onClockText() {
  if (clockBusy || !clock) return;
  const t = clock.text || '';
  if (/[০-৯]/.test(t)) return;
  const m = t.match(/^(.*?)\s+(\d{1,2}[\u200e\u200f]?[:\u2236].*)$/);
  if (!m) return;
  clockBusy = true;
  try {
    clock.clutter_text.set_markup(
      `${esc(m[1])}  <span font_family="${BN_FONT}">${banglaDate(new Date())}</span>  ${esc(m[2])}`);
  } catch (e) { log(`topbar-tweaks clock: ${e}`); }
  clockBusy = false;
}

function hideClipboardIcon() {
  Object.keys(Main.panel.statusArea).forEach(k => {
    if (/clipboard/i.test(k)) {
      const item = Main.panel.statusArea[k];
      if (item && item.container && !hidden.includes(item)) {
        item.container.hide();
        hidden.push(item);
      }
    }
  });
}

function styleInner(actor, isSpeed) {
  actor.get_children().forEach(c => {
    if (c instanceof St.Icon || c instanceof St.Label) {
      styled.push([c, c.style]);
      c.style = (isSpeed && c instanceof St.Label) ? SPEED_STYLE : INNER_STYLE;
    } else {
      styleInner(c, isSpeed);
    }
  });
}

function styleItems() {
  ORDER.forEach(k => {
    const item = Main.panel.statusArea[k];
    if (item && !item._momenStyled) {
      item._momenStyled = true;
      styled.push([item, item.style]);
      item.style = ITEM_STYLE;
      styleInner(item, k === 'netspeed@momen');
    }
  });
}

function orderItems() {
  const box = Main.panel._rightBox;
  let idx = 0;
  ORDER.forEach(k => {
    const item = Main.panel.statusArea[k];
    if (item && item.container && item.container.get_parent() === box) {
      box.set_child_at_index(item.container, idx);
      idx++;
    }
  });
}

function tidy() {
  hideClipboardIcon();
  styleItems();
  orderItems();
}

function init() {}

function enable() {
  const mm = Main.panel.menuManager;
  origEnter = mm._onMenuSourceEnter;
  mm._onMenuSourceEnter = function () { return false; };
  (mm._menus || []).forEach(md => {
    const src = md.menu && md.menu.sourceActor;
    if (src && md.enterId) {
      try { src.block_signal_handler(md.enterId); blocked.push([src, md.enterId]); } catch (e) {}
    }
  });


  tidy();
  let tries = 0;
  timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
    tidy();
    tries++;
    return tries < 15 ? GLib.SOURCE_CONTINUE : GLib.SOURCE_REMOVE;
  });
}

function disable() {
  if (timer) GLib.source_remove(timer);
  timer = 0;
  if (clock && clockSig) clock.disconnect(clockSig);
  clockSig = 0;
  clock = null;
  hidden.forEach(item => { try { item.container.show(); } catch (e) {} });
  hidden = [];
  styled.forEach(([a, s]) => { try { a.style = s; a._momenStyled = false; } catch (e) {} });
  styled = [];
  blocked.forEach(([src, id]) => { try { src.unblock_signal_handler(id); } catch (e) {} });
  blocked = [];
  if (origEnter) Main.panel.menuManager._onMenuSourceEnter = origEnter;
  origEnter = null;
}
