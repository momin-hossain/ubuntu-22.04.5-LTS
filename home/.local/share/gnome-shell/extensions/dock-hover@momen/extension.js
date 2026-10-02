const { Clutter, GLib, St } = imports.gi;
const Main = imports.ui.main;

const ZOOM = 1.28;
const NEAR_ZOOM = 1.1;
const LIFT = -9;
const NEAR_LIFT = -3;
const DURATION = 170;

let timer = 0;
let dock = null;
let tracked = [];
let hoverIdx = -1;
let unclipped = [];

function findDock() {
  let found = null;
  const walk = a => {
    if (found) return;
    if (a.name === 'dashtodockContainer') { found = a; return; }
    for (const c of a.get_children()) walk(c);
  };
  walk(Main.layoutManager.uiGroup);
  return found;
}

function collectIcons(root) {
  const out = [];
  const walk = a => {
    if (a instanceof St.Button && (a.has_style_class_name('app-well-app') || a.has_style_class_name('show-apps'))) {
      out.push(a);
      return;
    }
    for (const c of a.get_children()) walk(c);
  };
  walk(root);
  return out;
}

function unclipAncestors(actor) {
  let a = actor.get_parent();
  while (a && a !== Main.layoutManager.uiGroup) {
    if (a.clip_to_allocation && !unclipped.includes(a)) {
      a.clip_to_allocation = false;
      unclipped.push(a);
    }
    a = a.get_parent();
  }
}

function update() {
  tracked.forEach((ic, idx) => {
    let s = 1, y = 0;
    if (hoverIdx >= 0) {
      const d = Math.abs(idx - hoverIdx);
      if (d === 0) { s = ZOOM; y = LIFT; }
      else if (d === 1) { s = NEAR_ZOOM; y = NEAR_LIFT; }
    }
    try {
      ic.ease({
        scale_x: s, scale_y: s, translation_y: y,
        duration: DURATION,
        mode: hoverIdx >= 0 ? Clutter.AnimationMode.EASE_OUT_BACK : Clutter.AnimationMode.EASE_OUT_QUAD,
      });
    } catch (e) {}
  });
}

function scan() {
  try {
    if (!dock || !dock.get_stage()) dock = findDock();
    if (!dock) return GLib.SOURCE_CONTINUE;
    tracked = collectIcons(dock)
      .filter(ic => ic.get_stage())
      .sort((a, b) => a.get_transformed_position()[0] - b.get_transformed_position()[0]);
    tracked.forEach(ic => {
      if (ic._hoverLiftHooked) return;
      ic._hoverLiftHooked = true;
      ic.set_pivot_point(0.5, 1.0);
      unclipAncestors(ic);
      ic._hoverLiftEnter = ic.connect('enter-event', () => { hoverIdx = tracked.indexOf(ic); update(); });
      ic._hoverLiftLeave = ic.connect('leave-event', () => {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 40, () => {
          if (!tracked.some(t => t.hover)) { hoverIdx = -1; update(); }
          return GLib.SOURCE_REMOVE;
        });
      });
    });
  } catch (e) {
    log(`dock-hover: ${e}`);
  }
  return GLib.SOURCE_CONTINUE;
}

function init() {}

function enable() {
  scan();
  timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, scan);
}

function disable() {
  if (timer) GLib.source_remove(timer);
  timer = 0;
  tracked.forEach(ic => {
    try {
      if (ic._hoverLiftEnter) ic.disconnect(ic._hoverLiftEnter);
      if (ic._hoverLiftLeave) ic.disconnect(ic._hoverLiftLeave);
      ic._hoverLiftHooked = false;
      ic.remove_all_transitions();
      ic.set_scale(1, 1);
      ic.translation_y = 0;
    } catch (e) {}
  });
  unclipped.forEach(a => { try { a.clip_to_allocation = true; } catch (e) {} });
  unclipped = [];
  tracked = [];
  hoverIdx = -1;
  dock = null;
}
