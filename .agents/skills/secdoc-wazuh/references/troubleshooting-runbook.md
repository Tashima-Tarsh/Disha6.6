# Wazuh Troubleshooting Runbook (symptom-indexed)

Paths/ports marked (v) checked against Wazuh 4.14.x, 2026-08-15.

## "Nothing from device X appears in the dashboard"

The most common report, and usually NOT an ingestion failure. Run the four-stage check in order and stop at the first failure:

1. **Wire**: `tcpdump -i any -n port 514 -c 10` on the manager. Nothing arriving = sender-side problem (device syslog config, routing/firewall between device and manager, wrong destination port).
2. **Read**: `<logall_json>yes</logall_json>` in `<global>`, restart, `grep <device-ip> /var/ossec/logs/archives/archives.json | tail -3`. Arriving-but-not-in-archives = `<remote>` block problems: missing/wrong `allowed-ips` (must match the SOURCE ip on the wire, check the tcpdump), wrong protocol, port conflict with a local rsyslog.
3. **Decode**: paste a raw line into `/var/ossec/bin/wazuh-logtest`. No decoder = write one (local_decoder.xml). Wrong decoder match = check prematch collisions with stock decoders.
4. **Alert**: decodes but no rule >= level 3 = the event is invisible by design. Write local rules. This is the answer for most network-device integrations.

## "Agent shows disconnected / never connects"

- `systemctl status wazuh-agent` and `/var/ossec/logs/ossec.log` on the endpoint first.
- `ERROR: (1216)` connection refused: TCP 1514 blocked between agent and manager. Check every firewall in the path including host firewalls and your own inter-VLAN segmentation.
- `Duplicate agent name` or `Invalid key`: stale enrollment. On manager: `/var/ossec/bin/manage_agents -r <id>` then re-enroll agent (or force re-registration).
- Agent connects then flaps: MTU issues over VPN paths, or manager under event flood (check `/var/ossec/var/run/wazuh-analysisd.state` events_dropped counters (v)).
- Fleet view: `/var/ossec/bin/agent_control -l`; `-i <id>` for one agent's detail.

## "Dashboard is empty / index errors"

- `curl -sk -u admin:PASS https://localhost:9200/_cluster/health?pretty`: red = an index has unassigned primaries; usually disk. yellow on single-node = normal (replicas can't assign).
- Disk watermarks (v ~85/90/95%): past flood-stage, OpenSearch sets indices read-only. Symptom: manager fine, alerts.json growing, nothing new in dashboard. Fix: free disk, then clear the block:
  `curl -sk -u admin:PASS -X PUT https://localhost:9200/_all/_settings -H 'Content-Type: application/json' -d '{"index.blocks.read_only_allow_delete": null}'`
- Filebeat ship check: `filebeat test output` (v; on manager). Auth errors after cert changes are common.
- Index pattern missing in dashboard after version jumps: recreate `wazuh-alerts-*` pattern in dashboard stack management.

## "Manager won't start after config change"

- `journalctl -u wazuh-manager -n 50` and `/var/ossec/logs/ossec.log`: `(1226)` = XML/config error, line number given. ossec.conf is strict XML: unescaped `&`, `<` in values, or a `<remote>` missing `<connection>` are the usual culprits.
- Validate rules/decoders offline before restart: wazuh-logtest loads them and reports syntax problems without touching the service.

## "Too many alerts / dashboard is noise"

See references/tuning-and-rules.md. Short version: identify top talkers (`Top rules` in dashboard or `grep -o '"id":"[0-9]*"' alerts.json | sort | uniq -c | sort -rn | head`), then per rule decide: level-0 child for the benign case, threshold/frequency rewrite, or CDB allowlist. Never disable a stock rule globally when a scoped child can silence just the benign slice.

## "Events stopped at time X" (was working)

Check in order: disk full (indexer watermarks above), certificate expiry (filebeat -> indexer TLS: `filebeat test output`), manager event drops under flood (`wazuh-analysisd.state`), logrotate/archive growth if logall was left on, and upstream sender changes (device firmware update changed log format: decoders silently stop matching; re-run stage-3 logtest with a fresh sample).
