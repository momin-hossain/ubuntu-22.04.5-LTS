#!/bin/bash
# =====================================================================
#  install.sh - rebuild Momen's Ubuntu 22.04 setup on a fresh install.
#
#    ./install.sh            everything
#    ./install.sh apps       only apps (Chrome, VS Code, XAMPP, Node, Git...)
#    ./install.sh home       only your files, scripts, extensions, settings
#    ./install.sh system     only system tweaks (disks, boot logo, login screen...)
#
#  When it finishes: RESTART the PC. Extensions switch on at next login.
#  Made for Ubuntu 22.04 / GNOME 42 only.
# =====================================================================
set -u
R="$(cd "$(dirname "$0")" && pwd)"
PART="${1:-all}"
NODE_VER=22.20.0
GIT_VER=2.46.1
XAMPP_VER=8.2.12
step() { echo; echo "=================== $* ==================="; }
want() { [ "$PART" = all ] || [ "$PART" = "$1" ]; }

grep -q 'jammy' /etc/os-release || { echo "This is for Ubuntu 22.04 only. Stopping."; exit 1; }
[ "$EUID" -ne 0 ] || { echo "Run as your normal user (not sudo). It will ask for the password."; exit 1; }
sudo -v || exit 1
( while true; do sudo -n true; sleep 50; kill -0 "$$" 2>/dev/null || exit; done ) 2>/dev/null &

# ---------------------------------------------------------------------
if want apps; then
step "Apt packages"
sudo apt update
sudo apt install -y curl wget git rsync jq wmctrl zenity imagemagick inotify-tools net-tools \
  ldmtool ntfs-3g ibus-avro ksnip gnome-screenshot gnome-tweaks gnome-shell-extension-manager \
  gnome-session-canberra dconf-cli libglib2.0-bin build-essential
if [ -f "$R/packages/apt-manual.txt" ]; then
  apt-cache --generate pkgnames | sort -u > /tmp/avail.txt
  comm -12 "$R/packages/apt-manual.txt" /tmp/avail.txt > /tmp/want.txt
  echo "Installing $(wc -l < /tmp/want.txt) saved packages..."
  xargs -a /tmp/want.txt sudo apt install -y || \
    while read -r p; do sudo apt install -y "$p" >/dev/null 2>&1 || echo "  skip $p"; done < /tmp/want.txt
fi

step "Google Chrome"
if ! command -v google-chrome >/dev/null; then
  wget -qO /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && sudo apt install -y /tmp/chrome.deb
fi

step "VS Code"
if ! command -v code >/dev/null; then
  echo "code code/add-microsoft-repo boolean true" | sudo debconf-set-selections
  wget -qO /tmp/code.deb 'https://code.visualstudio.com/sha/download?build=stable&os=linux-deb-x64' \
    && sudo apt install -y /tmp/code.deb
fi
if [ -f "$R/packages/vscode-extensions.txt" ] && command -v code >/dev/null; then
  while read -r e; do [ -n "$e" ] && code --install-extension "$e" --force >/dev/null 2>&1 && echo "  + $e"; done \
    < "$R/packages/vscode-extensions.txt"
fi

step "Snap apps"
if [ -f "$R/packages/snap.txt" ]; then
  while read -r s; do
    case "$s" in core*|snapd|bare|gnome-*|gtk-common-themes|snapd-desktop-integration|snap-store|firefox) continue;; esac
    snap list "$s" >/dev/null 2>&1 || sudo snap install "$s" 2>/dev/null || sudo snap install "$s" --classic
  done < "$R/packages/snap.txt"
fi

step "Node.js $NODE_VER (nvm)"
if [ ! -d "$HOME/.nvm" ]; then
  wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
nvm install "$NODE_VER" && nvm alias default "$NODE_VER" && npm install -g yarn nodemon

step "Git $GIT_VER"
if ! git --version | grep -q "$GIT_VER"; then
  sudo apt install -y libssl-dev libcurl4-gnutls-dev libexpat1-dev gettext zlib1g-dev
  ( cd /tmp && wget -q "https://mirrors.edge.kernel.org/pub/software/scm/git/git-$GIT_VER.tar.gz" \
    && tar -xzf "git-$GIT_VER.tar.gz" && cd "git-$GIT_VER" \
    && make -j"$(nproc)" prefix=/usr/local NO_TCLTK=YesPlease all >/dev/null \
    && sudo make prefix=/usr/local NO_TCLTK=YesPlease install >/dev/null && echo "  git $GIT_VER installed" )
fi

step "XAMPP $XAMPP_VER"
if [ ! -d /opt/lampp ]; then
  wget -qO /tmp/xampp.run "https://sourceforge.net/projects/xampp/files/XAMPP%20Linux/$XAMPP_VER/xampp-linux-x64-$XAMPP_VER-0-installer.run/download" \
    && chmod +x /tmp/xampp.run && sudo /tmp/xampp.run --mode unattended \
    && sudo chown -R "$USER:$USER" /opt/lampp/htdocs
fi
fi

# ---------------------------------------------------------------------
if want home; then
step "Your files, scripts and extensions"
rsync -a "$R/home/" "$HOME/"
chmod +x "$HOME"/.local/bin/* "$HOME"/.local/share/nautilus/scripts/* 2>/dev/null
mkdir -p "$HOME/Pictures/Lockscreen"
# re-download any extension zips from extensions.gnome.org? no - copied from backup.
gtk-update-icon-cache -f "$HOME/.local/share/icons/Momen" >/dev/null 2>&1
for d in "$HOME"/.local/share/gnome-shell/extensions/*/schemas; do
  [ -d "$d" ] && glib-compile-schemas "$d" 2>/dev/null
done

step "GNOME settings (dock, top bar, shortcuts, keyboard, extensions)"
[ -f "$R/dconf/gnome.ini" ] && dconf load /org/gnome/ < "$R/dconf/gnome.ini" && echo "  + gnome"
[ -f "$R/dconf/ibus.ini" ]  && dconf load /desktop/ibus/ < "$R/dconf/ibus.ini" && echo "  + ibus (Banglish)"
[ -f "$R/dconf/gtk.ini" ]   && dconf load /org/gtk/ < "$R/dconf/gtk.ini" && echo "  + gtk"

step "Clock format (24 Sep 11:21:45 PM)"
sudo locale-gen en_GB.UTF-8 >/dev/null && sudo update-locale LC_TIME=en_GB.UTF-8
fi

# ---------------------------------------------------------------------
if want system; then
S="$R/system"
put() {  # put <absolute path>  -> copy from backup to system, keep .bak
  [ -e "$S$1" ] || return 1
  [ -e "$1" ] && [ ! -e "$1.bak" ] && sudo cp -a "$1" "$1.bak"
  sudo mkdir -p "$(dirname "$1")"
  sudo cp -a "$S$1" "$(dirname "$1")/" && sudo chown -R root:root "$1" && echo "  + $1"
}

step "Windows disks D / E / F"
if put /etc/systemd/system/ldm-volumes.service; then
  sudo systemctl daemon-reload
  sudo systemctl enable ldm-volumes.service
  sudo ldmtool create all >/dev/null 2>&1
  if [ -f "$S/fstab-lines.txt" ]; then
    sudo cp -n /etc/fstab /etc/fstab.bak
    while read -r line; do
      dev=$(echo "$line" | awk '{print $1}'); mp=$(echo "$line" | awk '{print $2}')
      grep -qF "$dev " /etc/fstab && continue
      if [ -b "$dev" ]; then sudo mkdir -p "$mp"; echo "$line" | sudo tee -a /etc/fstab >/dev/null; echo "  + fstab $mp"
      else echo "  skip $mp (disk not found on this PC)"; fi
    done < "$S/fstab-lines.txt"
    sudo systemctl daemon-reload; sudo mount -a 2>/dev/null
  fi
  sudo systemctl disable NetworkManager-wait-online.service 2>/dev/null
fi

step "Boot menu + HP boot logo"
if put /etc/default/grub; then sudo update-grub >/dev/null 2>&1; fi
if [ -d "$S/usr/share/plymouth/themes/hp-spinner" ]; then
  put /usr/share/plymouth/themes/hp-spinner
  sudo update-alternatives --install /usr/share/plymouth/themes/default.plymouth default.plymouth \
    /usr/share/plymouth/themes/hp-spinner/hp-spinner.plymouth 150 >/dev/null
  sudo update-alternatives --set default.plymouth /usr/share/plymouth/themes/hp-spinner/hp-spinner.plymouth
  echo "  updating boot image (1-2 min)..."; sudo update-initramfs -u >/dev/null 2>&1
fi

step "Login screen (no Ubuntu logo, your picture, no blue box)"
put /etc/gdm3/greeter.dconf-defaults && sudo dpkg-reconfigure gdm3 >/dev/null 2>&1
if put /usr/local/sbin/set-login-bg; then
  sudo chmod 755 /usr/local/sbin/set-login-bg
  [ -f "$HOME/Pictures/lockscreen.jpg" ] && sudo /usr/local/sbin/set-login-bg "$HOME/Pictures/lockscreen.jpg"
fi

step "Bluetooth + session settings"
put /etc/bluetooth/main.conf && sudo systemctl restart bluetooth
put /etc/systemd/logind.conf

step "Password-free buttons (Dev Services, login picture)"
for f in "$S"/etc/sudoers.d/*; do
  [ -f "$f" ] || continue
  if sudo visudo -cf "$f" >/dev/null; then
    sudo install -m 440 -o root -g root "$f" "/etc/sudoers.d/$(basename "$f")" && echo "  + sudoers $(basename "$f")"
  else echo "  skip $(basename "$f") (invalid)"; fi
done
fi

echo
echo "=========================================================="
echo " DONE. Restart the PC now. After login everything is back."
echo " Then make a new GitHub SSH key:  ssh-keygen -t ed25519"
echo "=========================================================="
