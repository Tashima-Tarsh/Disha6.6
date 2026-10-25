# Management and config lifecycle

Covers how you administer and back up each platform: web GUI, console, SSH, the single-file config model on the pf platforms, backup and restore, the pfSense Plus Nexus transition, UniFi controller topology and UniFi OS, and where an engineer drops beneath the controller to the real config.

Perishable specifics below were checked 2026-08-15 and are marked `(v)`. Durable mechanics carry no mark.

## Durable mechanics

### The pf platforms store everything in one XML file

Both OPNsense and pfSense keep the entire device configuration in a single `config.xml`. Rules, NAT, interfaces, services, certificates, users: all of it lives in that one file. This is the most useful durable fact about managing these boxes. It means a backup is one file, a restore is one file, a diff between two backups shows exactly what changed, and you can edit config offline and load it back. The GUI is a view and validator over this file; the console and SSH shells sit beneath it; the running state is compiled from it on load. Everything else about lifecycle follows from this single-file model.

### Three ways in, in order of blast radius

Web GUI for normal work. Console (physical or serial) for recovery and for the handful of things the GUI cannot do, including reset-to-defaults and reassign-interfaces when you have locked yourself out. SSH for scripting and for the same shell the console gives. Knowing the console menu exists, and that it can reset the GUI password and reassign interfaces, is what turns a lockout from a reinstall into a five-minute fix.

## OPNsense specifics (v, 26.7)

- Config file: **/conf/config.xml**. Backup and restore at **System > Configuration > Backups**, which also supports scheduled backups to Nextcloud, Google Drive, and Git, and keeps a versioned history so you can roll back a specific change.
- GUI: the web interface (Lighttpd/PHP), plus the console menu on the box and SSH (enable under **System > Settings > Administration**).
- CLI beneath the GUI: `configctl` drives services, `pfctl` shows the compiled firewall, `opnsense-*` helper tools (`opnsense-update`, `opnsense-patch`, `opnsense-revert`) handle firmware, patches, and reverting a single package. `opnsense-revert` is the quiet superpower: roll one package back to a prior version without touching the rest.
- Update model: **System > Firmware**, fortnightly patches on the current series, majors in January and July. Only the latest series is supported. (v)

## pfSense specifics (v, CE 2.8.1 / Plus 26.07)

- Config file: **/cf/conf/config.xml** (symlinked as /conf/config.xml). Backup and restore at **Diagnostics > Backup & Restore**. The **AutoConfigBackup (ACB)** service encrypts config on every change and stores it in Netgate's cloud, rewritten and hardened in the 2.8 line; it is free and worth enabling. (v)
- GUI: the legacy PHP web interface. Console menu (option 8 for a shell, option 4 reset to factory, option 5 reboot, option 11 restart webConfigurator, option 13 restore a recent config). SSH enabled under **System > Advanced > Admin Access**.
- CLI beneath the GUI: `pfctl`, `pfSsh.php` (playback scripts for scripted changes), the standard FreeBSD shell.
- **The Nexus transition (this is the big perishable item)** (v): pfSense Plus 26.07 ships the **Netgate Nexus** controller, a **Go-based** replacement for the legacy PHP GUI and the stated future foundation for pfSense. Enable it at **System > Advanced > Netgate Nexus**, then reach the new GUI on **port 8443**; both interfaces run in parallel through the transition, with Netgate targeting a full move to the new GUI by end of 2026. Two field caveats to state every time: Nexus **will not license without a serial number and a UUID**, so many virtual machines and third-party platforms cannot run the new GUI yet (on a VM, supplying SMBIOS type-1 serial and UUID has been the workaround), and the Plus-exclusive features (CoreDNS/rexdns, ThreatGate, Snort 3) live inside Nexus, so they are Plus-and-Nexus only, never on CE. When giving any pfSense Plus GUI path, confirm whether the box is on the legacy PHP GUI or Nexus first, because the paths differ. (v)
- CE stays on the legacy PHP GUI; none of the Nexus-exclusive features come to CE. (v)

## UniFi specifics (v, Network 9.x)

UniFi's model is different in kind: the **controller** (the Network application) manages one or more gateways and devices, and it runs on a **UniFi OS** console (a UDM/UDM Pro/UDM SE, a Cloud Gateway, a Cloud Key, or self-hosted). The device configuration is not a single portable XML file you hand-edit; it is controller state pushed to devices.

- Controller topology: **UniFi OS** is the base platform on the console; the **Network** application is one app on it (Protect, Access, and others are siblings). The gateway enforces; the controller configures. On a UDM-class device the controller and gateway are the same box; with a separate Cloud Key or self-hosted controller, they are not, which changes where you log in and what happens if the controller is offline (enforcement continues, configuration does not).
- Access: the web GUI via the console's IP or via remote access (SSO through unifi.ui.com / the Site Manager). Cloud Gateways and Gen2 Cloud Keys run UniFi OS and present the UI on **443**; the legacy Gen1 Cloud Key ran the Network app directly on **8443**. (v)
- Backup: controller backups are made in the Network app settings (auto-backup and manual export of a `.unf` file); this is a controller backup, not a device config file. (v)
- **Dropping beneath the controller**: SSH to the gateway (device credentials set in the controller), then `unifi-os shell` to enter the UniFi OS container context on some models. From there `nft list ruleset` shows the compiled firewall, `vtysh` reaches FRR, `ip route` and standard Linux tools show the real state. Historically advanced overrides went in a `configure.gateway.json` (legacy controller feature) that the controller merged on provision; its availability and role have changed with the ZBF/UniFi OS generations, so verify before relying on it, and expect the controller to overwrite hand edits on the next provision. The rule of thumb: the controller is the source of truth, and anything you change beneath it is temporary unless the controller is taught to keep it. (v)

## Cross-platform translation (quick view)

| Lifecycle task | OPNsense | pfSense | UniFi |
|---|---|---|---|
| Where the config lives | /conf/config.xml (one file) | /cf/conf/config.xml (one file) | Controller state, not a portable file |
| Back it up | System > Configuration > Backups | Diagnostics > Backup & Restore, plus ACB | Network app backup (.unf) |
| Cloud auto-backup | Nextcloud/Drive/Git targets | AutoConfigBackup (ACB) | SSO / Site Manager cloud |
| Recover from lockout | Console menu (reset pw, reassign) | Console menu (option 4/13) | Controller reset / device reset |
| Shell beneath the GUI | SSH, configctl, pfctl | SSH, pfSsh.php, pfctl | SSH to gateway, unifi-os shell, nft, vtysh |
| Current GUI in flux | Stable PHP GUI | Legacy PHP GUI moving to Nexus (Go, 8443) (v) | UniFi OS on 443 (Gen1 CK on 8443) (v) |

Portable lesson: on the pf platforms the whole device is one XML file, which makes backup, diff, and offline edit trivial, and the console menu is your lockout insurance. UniFi inverts this: the controller is authoritative and the device is provisioned from it, so back up the controller, and treat anything you change beneath the controller as temporary. The live churn to watch is the pfSense Plus Nexus GUI cutover.
