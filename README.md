# Momen's Ubuntu 22.04 setup

My HP laptop setup after moving from Windows 11 to **Ubuntu 22.04.5 LTS (GNOME 42)**.
Everything is saved here so a fresh install can be rebuilt with one command.

---

## 1. Backup and restore

| Task | Command |
|---|---|
| Save my current setup to GitHub (after any change) | `ubackup` |
| Same thing, long form | `cd ~/Projects/Personal/ubuntu-22.04.5-LTS && ./backup.sh && git add -A && git commit -m "update" && git push` |
| Rebuild everything on a fresh Ubuntu 22.04 | `git clone https://github.com/momin-hossain/ubuntu-22.04.5-LTS.git && cd ubuntu-22.04.5-LTS && ./install.sh` then **restart** |
| Only apps (Chrome, VS Code, XAMPP, Node, Git) | `./install.sh apps` |
| Only my files, extensions, settings | `./install.sh home` |
| Only system tweaks (disks, boot logo, login screen) | `./install.sh system` |
| **Only speed fixes** (any Ubuntu 22.04 PC, keeps its own files/settings) | `./install.sh speed` then log out → log in |

On a new PC, also make a new GitHub SSH key: `ssh-keygen -t ed25519 -C "momin-hossain"` and add `~/.ssh/id_ed25519.pub` on GitHub.
Not stored here on purpose: SSH keys, passwords, keyring, Chrome profile, tokens, wallpapers.

---

## 2. Daily use: what does what

### Top bar (left → right)
| Item | What it does |
|---|---|
| Ubuntu logo (left) | Click = show desktop (minimize all) / click again = restore |
| `↓ 120K ↑ 8K` | Live internet speed |
| Camera icon | Screenshot an area → opens editor (draw, arrow, text) |
| Server icon | **Dev Services**: Apache / MySQL switches, phpMyAdmin, htdocs |
| Keyboard `en` / `bn` | Language switch. **Super+Space** = English ↔ Banglish (Avro) |
| Battery | Green fill + bolt = charging, white with cut bolt = plugged in and full |
| Power icon (far right) | Shut down menu |

Menus open on **click only**, not on mouse hover.

### Keyboard shortcuts
| Keys | Action |
|---|---|
| **Super+V** | Clipboard history (last 50). Click an item = it pastes straight away |
| **Super+T** | Open terminal |
| **Super+M** | Notification list |
| **Super+Space** | English ↔ Banglish |
| **Super+L** | Lock screen |
| **Alt+Tab** | Window switcher (Ubuntu built-in; Coverflow extension is off) |
| **F4** (in Files) | Open terminal in that folder |

### Dock
- Click an app = open / focus. Click the **focused** app = minimize it.
- Dock auto-hides; move the mouse to the bottom to show it.
- **Start Work** button: opens Chrome + VS Code (full screen) + starts Apache and MySQL.

### Files (file manager)
- Sidebar: **Volume D / E / F** (Windows drives, mounted at `/mnt/D`, `/mnt/E`, `/mnt/F`) and shortcuts **Atysan, Ejazah, KatsanaTech**.
- Right-click a picture → **Scripts → Set as Lock Screen**.
- Right-click → **Scripts → Lock Screen - Random Pictures** = random picture every unlock.

### Lock screen and login screen
- Wallpapers come from **E:\Wallpaper** (`/mnt/E/Wallpaper`), a new random one each unlock.
- Choose a fixed picture or random mode: open app **Lock Screen Settings**.
- Login screen (after restart) uses the same picture automatically. No Ubuntu logo, no blue box.
- Download more HD wallpapers into E:\Wallpaper: `get-wallpapers` (resumes if stopped; more: `PAGES=6 get-wallpapers`).

### Desktop
- World clocks (Dhaka, Kuala Lumpur, London, New York) and Gazipur weather on the desktop.
- Notifications slide in at the top-right with a glass style and sound.
- Sounds for: charger plug/unplug, USB plug/unplug, every notification.
- Unplug charger → battery saver mode + clock seconds hidden. Plug in → normal mode.
- After restart, VS Code / Files / terminal windows reopen automatically (session keeper).
- Screen never turns off by itself, no auto-suspend.

### Dev tools
| Tool | Version / command |
|---|---|
| Node.js | 22.20.0 via nvm (`nvm use 22`) |
| Git | 2.46.1 |
| XAMPP | 8.2.12 at `/opt/lampp` (`xon` / `xoff`, or the Dev Services menu) |
| phpMyAdmin | http://localhost/phpmyadmin |
| Projects | `/mnt/D/Projects` |
| Bluetooth earbuds | Always connect in music quality (A2DP) |

---

## 3. Useful commands

| Task | Command |
|---|---|
| Update everything | `sudo apt update && sudo apt full-upgrade -y` |
| Turn an extension off / on | `gnome-extensions disable NAME` / `gnome-extensions enable NAME` |
| List my extensions | `gnome-extensions list --enabled` |
| Change login screen picture by hand | `sudo set-login-bg /path/picture.jpg` |
| Restore Ubuntu's default login screen | `sudo set-login-bg --reset` |
| Mount the Windows drives again | `sudo mount -a` |
| Check boot speed | `systemd-analyze` |

New or changed extensions only load after **log out → log in**.

---

## 4. Undo things

| Undo | Command |
|---|---|
| HP boot logo → Ubuntu default | `sudo update-alternatives --set default.plymouth /usr/share/plymouth/themes/bgrt/bgrt.plymouth && sudo update-initramfs -u` |
| Boot menu settings | `sudo cp /etc/default/grub.bak /etc/default/grub && sudo update-grub` |
| Ubuntu logo on login screen back | `sudo cp /etc/gdm3/greeter.dconf-defaults.bak /etc/gdm3/greeter.dconf-defaults && sudo dpkg-reconfigure gdm3` |
| Drives E/F auto-mount | `sudo umount /mnt/E /mnt/F; sudo cp /etc/fstab.bak-ef /etc/fstab; sudo systemctl daemon-reload` |
| Sidebar shortcuts | `cp ~/.config/gtk-3.0/bookmarks.bak ~/.config/gtk-3.0/bookmarks; nautilus -q` |
| Paste-on-select (Super+V) | `gnome-extensions disable clip-paste@momen` |
| VS Code auto full screen | `gnome-extensions disable auto-maximize@momen` |
| NVIDIA card back on (nouveau) | `sudo rm /etc/modprobe.d/blacklist-nouveau.conf /etc/udev/rules.d/80-nvidia-pm.rules && sudo update-initramfs -u` then restart |
| File search inside files (Tracker) | `systemctl --user unmask tracker-miner-fs-3.service tracker-extract-3.service` then log out/in |
| Auto-updates fully off | `sudo systemctl disable --now apt-daily.timer apt-daily-upgrade.timer && sudo snap refresh --hold` |
| Always `balanced` power (cooler, quieter) | change `performance` to `balanced` in `~/.local/bin/charger-notify`, then log out/in |
| Network printer auto-discovery back | `sudo systemctl enable --now cups-browsed` |
| A speed-off widget back | `gnome-extensions enable netspeed@momen` (or `sysmon@momen`, `desktop-clocks@momen`) |

Every system file the install script replaces is backed up next to it as `*.bak`.

---

## Speed tweaks (Nov 2026)

The laptop (i5-7200U, 2 cores) was lagging. Causes and fixes, all applied by `install.sh`.
On another Ubuntu 22.04 PC run only `./install.sh speed` (the NVIDIA fix runs with `system`, and only if the PC has an NVIDIA card).

| Problem | Fix |
|---|---|
| `nouveau` driver kept waking the NVIDIA 930MX → stutters, "system is too slow" mouse lag | nouveau blocked (`/etc/modprobe.d/blacklist-nouveau.conf`), card powers down (`/etc/udev/rules.d/80-nvidia-pm.rules`). Screen runs on Intel HD 620. Don't install `nvidia-driver-470`: it fails to build on kernel 6.8. |
| Too many extensions redrawing every 1-2 s | Off: magic-lamp, Coverflow Alt-Tab, netspeed, sysmon, desktop-clocks |
| GNOME animations | **Kept ON.** Turning them off makes Chrome report `prefers-reduced-motion: reduce` to every website, so web animations stop (bad for web development). |
| Background work | File indexer (Tracker), update notifier, Evolution alarm, Ubuntu Pro popups off |
| Slow boot (~7 s) | `NetworkManager-wait-online` off; network printer auto-discovery (`cups-browsed`) off |
| Updates stealing CPU | Security updates (Ubuntu + Chrome) still install automatically, but at the lowest CPU/disk priority. Snaps once a week (Sun 12-14). Firmware checks, update popup and VS Code self-update off. Feature updates by hand: `sudo apt update && sudo apt upgrade` |
| Slow when memory fills | zram swap reads one page at a time (`vm.page-cluster = 0` in `/etc/sysctl.d/99-zram-speed.conf`) |
| CPU held back | `charger-notify` switches the power profile: **performance** on charger, **balanced** on battery. It now waits for plug/unplug events instead of checking every second. (Installed with `home`, not `speed`.) |
| VS Code drawn by the CPU | `~/.vscode/argv.json` has `"disable-hardware-acceleration": true` (set while nouveau was broken). Try `false` for smoother scrolling; set back to `true` if the screen flickers. |

---

## 5. What's in this repo

| Folder | Contents |
|---|---|
| `home/` | Custom extensions, helper scripts (`~/.local/bin`), Files scripts, icons, autostart, sidebar bookmarks, VS Code settings, `.bashrc` |
| `dconf/` | All GNOME settings: dock, clock, shortcuts, Banglish input, extension settings |
| `system/` | Disk mounting, GRUB, HP boot logo, login screen, Bluetooth, sudo rules for Dev Services / login picture |
| `packages/` | apt / snap / VS Code extension lists and versions |
| `backup.sh` | Copies the current setup into this repo |
| `install.sh` | Rebuilds everything on a fresh Ubuntu 22.04 |

**Ubuntu 22.04 only.** Newer Ubuntu (24.04 / 26.04) has a newer GNOME, so the custom extensions need rewriting before upgrading. Ubuntu 22.04 free updates end around April 2027.