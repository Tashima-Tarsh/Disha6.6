---
name: wazuh
description: "Wazuh SIEM/XDR: deploy, integrate, tune, troubleshoot."
version: 1.0.0
author: CIPHER + Lester Nichols
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [wazuh, siem, xdr, logging, detection, soc]
    related_skills: [graylog, cybersecurity-architecture, linux-engineering, firewall-platform-engineering]
---

# Wazuh SIEM/XDR Engineering

**Trigger scope**: anything Wazuh: wazuh-manager/indexer/dashboard, agent enrollment/disconnects, ossec.conf, decoders/rules, "syslog not showing up in Wazuh", FIM, SCA, vulnerability detection, active response, alert tuning, or integrating network devices (UniFi, pfSense/OPNsense) and OS fleets into Wazuh. Compose with the graylog skill for Graylog-fronted pipelines and cybersecurity-architecture for vendor-neutral SOC strategy.

Durable mechanics (pipeline behavior, decoder chaining, enrollment) are stated as fact. Version-specific paths, ports, and defaults are marked `(v)`, checked 2026-08-15 against Wazuh 4.14.7 (current stable, 2026-07-30). Wazuh ships minor releases roughly monthly; re-verify `(v)` items.

## Architecture (durable)

Four components, single-node or distributed:

1. **Wazuh agent**: on monitored endpoints. Collects logs, FIM, SCA, inventory; forwards to manager over TCP 1514 (v), encrypted with a per-agent key. Buffers locally when manager unreachable (`<client_buffer>`).
2. **Wazuh manager**: the analysis brain. Pipeline is strictly: raw event -> **pre-decode** (timestamp/hostname/program from syslog framing) -> **decode** (regex field extraction; decoders chain via `<parent>`) -> **rule match** (rules reference decoded fields; levels 0-15; level 0 = explicit ignore) -> alert if level >= threshold (default 3 (v)) -> `/var/ossec/logs/alerts/alerts.json` -> indexer via the filebeat module.
3. **Wazuh indexer**: OpenSearch fork. Alerts in `wazuh-alerts-4.x-*`, optional raw archives in `wazuh-archives-4.x-*`. Port 9200 (v).
4. **Wazuh dashboard**: OpenSearch Dashboards fork, port 443 (v).

Path anchors (v): install root `/var/ossec/`, config `/var/ossec/etc/ossec.conf`, local rules `/var/ossec/etc/rules/local_rules.xml`, local decoders `/var/ossec/etc/decoders/local_decoder.xml`, test tool `/var/ossec/bin/wazuh-logtest`.

## The distinction that explains most "Wazuh is not working" cases

**Alerts vs archives.** Default dashboard views show ALERTS only. An event that decodes but matches no rule at level >= 3 produces no alert and is invisible. Network-gear syslog (UniFi, pfSense) often decodes but matches no stock rule, so users conclude ingestion is broken when rule coverage is the actual gap.

Diagnose in this order, never out of order:
1. **Arriving?** `tcpdump -i any port 514` on the Wazuh box.
2. **Read?** Temporarily set `<logall_json>yes</logall_json>` in `<global>`, restart manager, check `/var/ossec/logs/archives/archives.json` for the raw line. Turn it back off; archives eat disk.
3. **Decoded?** Paste the raw line into `/var/ossec/bin/wazuh-logtest`. Shows pre-decode, decoder, and rule hit in one shot. This answers 90% of pipeline questions.
4. **Rule fires?** Logtest shows decode but no rule (or level < 3): write a local rule. That is the fix, not re-plumbing ingestion.

## Receiving syslog from network devices

Native remote syslog via `<remote>` in ossec.conf:

```xml
<remote>
  <connection>syslog</connection>
  <port>514</port>
  <protocol>udp</protocol>
  <allowed-ips>192.168.0.0/16</allowed-ips>
</remote>
```

Field-observed pitfalls:
- **`allowed-ips` is mandatory** for syslog mode; missing or non-matching CIDR = silent drop. Match against the sender's SOURCE ip: a multi-interface gateway (UniFi) sends from the egress-facing interface, not necessarily its management IP.
- Restart after `<remote>` changes: `systemctl restart wazuh-manager`.
- rsyslog/syslog-ng bound to 514 on the same box fights for the port: move Wazuh's `<port>` or let rsyslog receive and have Wazuh tail the file via `<localfile>`.
- Prefer TCP where the sender supports it; UniFi rsyslog is UDP-only (v).
- Host firewall/SELinux must permit the port.

UniFi gateways: Settings > Control Plane > Integrations > Activity Logging / SIEM Server (v, 9.x-10.x; older: System > Advanced > Remote Logging). Category toggles decide content; `firewall_default_policy` and `security_detections` carry firewall-block and IPS events. Stock decoders catch only part of UniFi's format; expect a local decoder for zone-block lines (references/unifi-integration.md).

## Agent lifecycle

Enrollment: TCP 1515 (v) enrollment service, or `WAZUH_MANAGER=<ip> WAZUH_REGISTRATION_PASSWORD=<pw>` at package install. Identity = client key in `/var/ossec/etc/client.keys` both ends.

Disconnect triage order: (1) `systemctl status wazuh-agent` on endpoint; (2) TCP 1514 reachability, including your own segmentation rules between agent VLANs and the manager; (3) key mismatch after reinstall (`Duplicate agent` / `Invalid key`: remove and re-enroll); (4) `/var/ossec/bin/agent_control -l` on the manager for fleet state.

## Rules and decoders

- Never edit stock files under `ruleset/`; upgrades overwrite. Overrides go in `local_rules.xml` with `<rule id="NNN" overwrite="yes">`, new rules in the 100000+ custom ID range (v).
- Noise reduction is rule work: `<if_sid>` children matching the noisy case at level 0, CDB lists for allowlists, raised levels for signal.
- Test every rule in wazuh-logtest before restart; watch `/var/ossec/logs/ossec.log` for `(1226)` config errors after.
- Tag custom detections with `<mitre><id>TXXXX</id></mitre>` so the MITRE dashboard stays honest.

## SIEM view design (composition guidance)

Wazuh is alert-centric: strongest for endpoint/XDR telemetry (FIM, SCA, vulnerability, MITRE, PCI/CIS compliance views ship stock). It is weak as a general log-exploration tool. Honest architecture calls:
- Fleet security telemetry + compliance: Wazuh alone suffices.
- Heavy network-log exploration, ad-hoc raw search, long retention: front with Graylog (graylog skill): devices -> Graylog (parse, route, retain) -> forward security-relevant streams to Wazuh, or dual-ship from the source. The graylog skill owns those mechanics.
- Never leave `logall_json` on permanently as a log store; disk eater with no retention control beyond logrotate.

## Health checklist (run first, always)

```bash
systemctl status wazuh-manager wazuh-indexer wazuh-dashboard
/var/ossec/bin/wazuh-control status
tail -50 /var/ossec/logs/ossec.log            # (1226)=config, (1213)=decoder
curl -sk -u admin:PASS https://localhost:9200/_cluster/health?pretty
/var/ossec/bin/agent_control -l
df -h /var/ossec /var/lib/wazuh-indexer       # full disk = silent death
```

Indexer red or disk past the flood watermark (~95% (v)) explains "events stopped appearing" more often than anything else.

## References

- references/unifi-integration.md: UniFi -> Wazuh end to end: sender config, decoder skeletons, block-storm rules, logtest validation.
- references/troubleshooting-runbook.md: symptom-indexed runbook.
- references/tuning-and-rules.md: noise reduction, custom rule patterns, CDB lists, MITRE tagging.

## Language standard

No em-dashes. No AI filler ("delve", "robust", "seamless", "it's important to note"). Practitioner voice: exact paths, exact commands, real config blocks. Durable mechanics as fact, perishable specifics marked (v).
