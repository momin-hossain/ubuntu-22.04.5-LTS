#!/bin/bash
# =====================================================================
#  backup.sh - copy Momen's current Ubuntu setup INTO this repo.
#  Run any time you change something:   ./backup.sh
#  Then:  git add -A && git commit -m "update" && git push
#  Never copies passwords, SSH keys, browser data or tokens.
# =====================================================================
set -u
R="$(cd "$(dirname "$0")" && pwd)"
H="$R/home"; S="$R/system"; P="$R/packages"
say() { echo "  + $*"; }
cp_home() {   # cp_home <path relative to ~>
  [ -e "$HOME/$1" ] || return 0
  mkdir -p "$H/$(dirname "$1")"
  rsync -a --delete --exclude='.git' "$HOME/$1" "$H/$(dirname "$1")/" && say "~/$1"
}
cp_sys() {    # cp_sys <absolute path>
  sudo test -e "$1" || return 0
  mkdir -p "$S$(dirname "$1")"
  sudo rsync -a --delete "$1" "$S$(dirname "$1")/" && say "$1"
}

command -v rsync >/dev/null || sudo apt install -y rsync
sudo -v || exit 1
echo "== Backing up into $R"

echo "-- Your files and settings"
rm -rf "$H"; mkdir -p "$H"
cp_home .local/share/gnome-shell/extensions
cp_home .local/bin
cp_home .local/share/nautilus/scripts
cp_home .config/nautilus/scripts-accels
cp_home .local/share/icons/Momen
cp_home .config/autostart
cp_home .config/gtk-3.0/gtk.css
cp_home .config/gtk-3.0/bookmarks
cp_home .config/Code/User/settings.json
cp_home .config/Code/User/keybindings.json
cp_home .bashrc
cp_home .profile
cp_home .gitconfig
cp_home Pictures/lockscreen.jpg
cp_home .face
mkdir -p "$H/.local/share/applications"
for f in "$HOME"/.local/share/applications/*.desktop; do
  [ -f "$f" ] || continue
  # only launchers made by us, not ones apps (Chrome web apps etc.) created
  grep -q "chrome-.*-Default\|Snap\|wine" "$f" && continue
  cp "$f" "$H/.local/share/applications/" && say "~/.local/share/applications/$(basename "$f")"
done
find "$H/.local/share/gnome-shell/extensions" -name '*.zip' -delete 2>/dev/null

echo "-- GNOME settings (dock, top bar, extensions, shortcuts, keyboard)"
mkdir -p "$R/dconf"
dconf dump /org/gnome/ \
  | awk '/^\[/{skip=($0 ~ /^\[(evolution|control-center|nautilus\/window-state|gnome-system-monitor|eog|gedit|epiphany|Totem|calculator|portal|software)/)} !skip' \
  > "$R/dconf/gnome.ini" && say "dconf /org/gnome/"
dconf dump /desktop/ibus/ > "$R/dconf/ibus.ini" && say "dconf /desktop/ibus/"
dconf dump /org/gtk/ > "$R/dconf/gtk.ini" && say "dconf /org/gtk/"

echo "-- System files (need sudo)"
rm -rf "$S"; mkdir -p "$S"
cp_sys /etc/systemd/system/ldm-volumes.service
cp_sys /etc/default/grub
cp_sys /etc/gdm3/greeter.dconf-defaults
cp_sys /etc/bluetooth/main.conf
cp_sys /etc/systemd/logind.conf
cp_sys /usr/local/sbin/set-login-bg
cp_sys /usr/share/plymouth/themes/hp-spinner
for f in /etc/sudoers.d/*; do
  case "$(basename "$f")" in README) continue;; esac
  cp_sys "$f"
done
grep -E 'ldm_vol|/mnt/' /etc/fstab > "$S/fstab-lines.txt" && say "fstab lines"
sudo chown -R "$USER:$USER" "$S"
chmod -R u+rw "$S"

echo "-- Package lists"
mkdir -p "$P"
apt-mark showmanual | sort > "$P/apt-manual.txt" && say "apt ($(wc -l < "$P/apt-manual.txt") packages)"
command -v snap >/dev/null && snap list 2>/dev/null | awk 'NR>1{print $1}' > "$P/snap.txt" && say "snap"
command -v code >/dev/null && code --list-extensions > "$P/vscode-extensions.txt" 2>/dev/null && say "VS Code extensions"
{ echo "ubuntu=$(lsb_release -ds)"; echo "gnome=$(gnome-shell --version)"
  echo "node=$(bash -ic 'node -v' 2>/dev/null)"; echo "git=$(git --version)"
  echo "xampp=$( [ -d /opt/lampp ] && echo installed || echo no)"; echo "date=$(date)"; } > "$P/versions.txt"

echo "-- Safety check (passwords / tokens)"
if grep -rIlE 'ghp_[A-Za-z0-9]{20,}|github_pat_|BEGIN (OPENSSH|RSA) PRIVATE KEY|password\s*=' "$R" \
     --exclude-dir=.git --exclude=backup.sh --exclude=install.sh --exclude=README.md; then
  echo "  !! The files above may contain a secret. Check them before 'git push'."
else
  echo "  OK - no tokens or keys found"
fi
echo "== Done. Now:  git add -A && git commit -m \"backup \$(date +%F)\" && git push"
