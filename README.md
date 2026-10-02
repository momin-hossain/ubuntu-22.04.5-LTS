# Momen's Ubuntu setup

Everything set up on my HP laptop (Ubuntu 22.04, GNOME 42) after moving from Windows,
saved so a fresh install can be rebuilt with one command.

## Rebuild on a fresh Ubuntu 22.04

```bash
sudo apt install -y git
git clone git@github.com:momin-hossain/ubuntu-22.04.5-LTS.git    # or the https URL
cd ubuntu-22.04.5-LTS
./install.sh          # everything  (or: ./install.sh apps | home | system)
```
Then **restart**. The extensions switch on at the first login.

## Save changes (after tweaking something)

```bash
cd /mnt/D/Projects/Personal/ubuntu-22.04.5-LTS
./backup.sh
git add -A && git commit -m "backup $(date +%F)" && git push
```

## What's inside

| Folder | What |
|---|---|
| `home/` | Custom extensions (home button, net speed, charger icon, Dev Services, screenshot, power button, weather, world clocks, dock click, auto-maximize, notification style, clip-paste, top-bar tweaks) + downloaded ones, helper scripts in `~/.local/bin` (charger notify, sounds, session keeper, Start Work, lock-screen rotate, max-code, get-wallpapers...), Files scripts (F4 terminal, Set as Lock Screen), icons, autostart, sidebar bookmarks (Volume D/E/F), VS Code settings, `.bashrc` |
| `dconf/` | All GNOME settings: dock, clock, shortcuts (Super+V, Super+T), Banglish (Avro) input, extension settings |
| `system/` | D/E/F disk mounting, GRUB, HP boot logo, login-screen picture + no Ubuntu logo, Bluetooth mode, password-free sudo rules for Dev Services / login picture |
| `packages/` | Lists of apt packages, snaps, VS Code extensions, versions |

## Not stored (on purpose)
SSH keys, passwords, keyring, Chrome profile, GitHub tokens. Make a new SSH key on a new PC:
`ssh-keygen -t ed25519 -C "momin-hossain"` and add it on GitHub.

Wallpapers are not stored either (too big) - they live on E:\Wallpaper. Run `get-wallpapers` to download more.

## Notes
- Ubuntu 22.04 only. Newer Ubuntu (24.04 / 26.04) uses newer GNOME, so the custom extensions need rewriting first.
- Every system file that gets replaced is backed up next to it as `*.bak`.
