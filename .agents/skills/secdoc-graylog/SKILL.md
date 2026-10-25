---
name: graylog
description: "Graylog log management: inputs, pipelines, streams, SIEM."
version: 1.0.0
author: CIPHER + Lester Nichols
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [graylog, logging, log-management, siem, syslog, pipelines]
    related_skills: [wazuh, cybersecurity-architecture, linux-engineering, firewall-platform-engineering]
---

# Graylog Log Management Engineering

**Trigger scope**: anything Graylog: inputs/extractors/pipelines/streams/indices, "logs not arriving in Graylog", GELF, sidecar, alerts/events, dashboards, retention/rotation, and architecting device-log collection (UniFi, pfSense, Linux/Windows fleets) through Graylog, including Graylog-in-front-of-Wazuh designs. Compose with the wazuh skill for the Wazuh side and cybersecurity-architecture for vendor-neutral SIEM strategy.

Durable mechanics stated as fact; version specifics marked `(v)`, checked 2026-08-15 against Graylog 7.1.x (current stable line; 7.2 in alpha). Graylog Open vs Enterprise/Security split matters: features like correlation engine, archiving to S3, and some security content are Enterprise (v); everything in this skill's core workflow is Open unless flagged.

## Architecture (durable)

Three services minimum:
1. **graylog-server**: ingestion, processing, API, and UI (single binary since 4.x (v)). Web/API default port 9000 (v).
2. **MongoDB**: configuration state only (inputs, streams, users). Small, low-load.
3. **OpenSearch** (or Datanode, Graylog's managed OpenSearch wrapper, default in 6.x+ (v)): the actual log store. All message data lives here; sizing and retention live here.

Message flow, strictly: **Input** (listener: syslog UDP/TCP, GELF, Beats, raw) -> **Extractors** (legacy per-input parsing; still supported, pipelines preferred (v)) -> **Message Filters / Pipeline rules** (route, parse, enrich, drop) -> **Streams** (routing buckets with rules; every message lands in at least All Messages) -> **Index Sets** (per-stream storage with rotation + retention) -> OpenSearch indices.

Processing order pitfall (v): check System > Configurations > Message Processors order. Pipeline processor must run AFTER Message Filter Chain if pipeline rules reference stream routing done by static stream rules; wrong order silently breaks stage conditions. This single setting explains many "my pipeline rule never matches" reports.

## Ingest patterns (durable)

- **Network devices (UniFi, pfSense, switches)**: Syslog UDP input on 1514+ (not 514: graylog-server runs unprivileged and cannot bind <1024 without setcap/systemd tricks (v)). Point devices at ip:1514. UniFi is UDP-only (v).
- **Linux fleet**: rsyslog/journald forward to syslog input, or filebeat -> Beats input.
- **Windows fleet**: winlogbeat/nxlog -> Beats/GELF input; Graylog Sidecar manages collector configs centrally (v).
- **Apps/containers**: GELF (structured, no parsing needed) over UDP/TCP/HTTP.

Silent-drop checklist when "nothing arrives": input running and bound (System > Inputs shows throughput counters), host firewall/container port mapping, device actually sending (tcpdump), source-port privilege (<1024 bind failure shows in server.log), and the journal: `/usr/share/graylog-server/bin/graylogctl` or `journalctl -u graylog-server` (v paths).

## Parsing: pipelines over extractors (durable guidance)

Pipeline rules attach to streams via pipeline connections, evaluate in numbered stages, and use a real language:

```
rule "parse unifi zbf block"
when
  has_field("message") && contains(to_string($message.message), "[ZBF-")
then
  let m = grok(pattern: "SRC=%{IP:srcip} DST=%{IP:dstip}.*PROTO=%{WORD:proto}(?: SPT=%{INT:srcport} DPT=%{INT:dstport})?", value: to_string($message.message));
  set_fields(m);
  set_field("event_type", "firewall_block");
end
```

- Grok patterns are managed under System > Grok Patterns; test in the rule simulator before deploying (v).
- Drop noise at the pipeline (`drop_message()`) BEFORE it costs index space; this is Graylog's biggest cost lever.
- Normalize field names once (srcip, dstip, user, action) and every dashboard/alert downstream gets simpler. If mixing with other tools, consider ECS-style naming for portability.

## Streams and index sets (durable)

- Streams = routing + permission boundary + alert scope. Sane minimum for a security estate: `firewall`, `ips`, `auth`, `infra-syslog`, `windows`, `apps`, plus default.
- Every stream maps to an index set sized for its retention: firewall blocks might keep 30 days hot; auth events 180+. Rotation by time (P1D) with max-N-indices retention is the workhorse (v).
- "Remove matches from All Messages" on stream rules avoids double storage (v).

## Alerts and the SIEM view (durable, Open edition)

Event Definitions: filter (query + streams + window) or aggregation (count/group-by thresholds) conditions produce Events; Notifications (email, HTTP webhook, script) fan out. Aggregation events cover the storm/brute-force class: `count() over 5m grouped by srcip where event_type=firewall_block > 50`.

Honest scope statement: Graylog Open is a superb log-management and search layer with capable threshold alerting; it is not a detection-content platform. No stock MITRE mappings, no endpoint telemetry, no FIM/SCA. That is Wazuh's half (wazuh skill). Correlation engine and security content packs are Enterprise/Security SKUs (v).

## Graylog + Wazuh reference architecture (the combined SIEM answer)

Devices and fleets ship once, land twice, each platform doing what it is good at:

```
UniFi/pfSense/devices --syslog--> Graylog:1514
Linux/Windows fleets  --beats/agent--> Graylog (all logs)  AND --wazuh-agent--> Wazuh (security telemetry)
Graylog pipelines: parse, normalize, drop noise, route streams, retain per policy
Graylog --syslog output (security streams only)--> Wazuh:514  [optional, when devices can't dual-ship]
Wazuh: decode/rules/alerts, compliance dashboards, MITRE view
```

Decision rules:
- Device supports ONE syslog target only (UniFi (v)): send to Graylog, forward the security-relevant stream to Wazuh via a Syslog output attached to that stream. Graylog becomes the fan-out point.
- Device supports multiple targets: dual-ship and keep the platforms independent (simpler failure domains).
- Keep raw retention in Graylog, alert-focus in Wazuh; resist mirroring everything into both.

## Health checklist

```bash
systemctl status graylog-server mongod opensearch   # or graylog-datanode (v)
curl -s -u admin:PASS http://localhost:9000/api/system/cluster/nodes | head
curl -s http://localhost:9200/_cluster/health?pretty  # green/yellow; red=disk usually
journalctl -u graylog-server -n 50                    # bind errors, ES connection, heap
# in UI: System > Overview (journal utilization!), System > Inputs (per-input throughput)
```

The **disk journal** is the early-warning gauge (System > Overview): utilization climbing = OpenSearch cannot keep up (disk, heap, or shard problems); messages are safe in the journal until it fills, then inputs drop. Journal full explains most "Graylog lost messages under load" incidents.

## References

- references/unifi-pipeline.md: UniFi -> Graylog: input setup, ZBF grok pipeline, stream routing, block-storm event definition, Wazuh forward output.
- references/troubleshooting-runbook.md: symptom-indexed: nothing arriving, journal filling, search slow, index red, pipeline not matching.
- references/sizing-retention.md: index set design, rotation strategies, heap/shard guidance, journal sizing.

## Language standard

No em-dashes. No AI filler. Practitioner voice: exact ports, real pipeline rules, real API calls. Durable mechanics as fact; perishable specifics marked (v); flag Enterprise-only features explicitly.
