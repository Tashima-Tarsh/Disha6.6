# Wazuh Tuning, Custom Rules, and Alert Strategy

## Alert-level strategy (durable)

Levels 0-15. Working bands that keep dashboards honest:
- 0: explicit ignore (children that silence benign matches)
- 3-5: informational visibility (things you want countable, not actionable)
- 6-9: investigate this week (policy violations, repeated auth failures, management-plane touches)
- 10-12: investigate today (storms, correlated multi-stage, confirmed IPS)
- 13-15: wake someone (active response candidates)

Email/integration thresholds key off levels; keep the bands disciplined or downstream paging becomes noise.

## Noise-reduction workflow (repeatable)

1. Quantify: top firing rules over 24-48h (dashboard Top rules, or alerts.json frequency count).
2. For each top talker, classify: benign-always (level-0 child), benign-in-context (child with `<srcip>`/`<hostname>`/CDB scoping), signal-but-chatty (frequency/timeframe rewrite to alert on aggregate), true signal (leave).
3. Implement as children in local_rules.xml with `<if_sid>parent</if_sid>`, never by editing stock rules.
4. Re-measure after 24h. Alert volume should drop >50% per iteration without losing any level>=10 class.

## Custom rule patterns

Scoped silence:
```xml
<rule id="100310" level="0">
  <if_sid>5710</if_sid>            <!-- sshd auth failure -->
  <srcip>192.168.2.5</srcip>       <!-- known scanner/monitor -->
  <description>Ignore auth scans from monitoring host</description>
</rule>
```

Aggregate-only alerting:
```xml
<rule id="100311" level="10" frequency="8" timeframe="120">
  <if_matched_sid>5710</if_matched_sid>
  <same_source_ip />
  <description>SSH brute force from $(srcip)</description>
  <mitre><id>T1110</id></mitre>
</rule>
```

CDB allowlist (list file + rule):
```
# /var/ossec/etc/lists/trusted-admins.cdb source: "ip:" keys
192.168.10.50:
192.168.2.5:
```
```xml
<rule id="100312" level="9">
  <if_sid>100202</if_sid>
  <list field="srcip" lookup="not_address_match_key">etc/lists/trusted-admins</list>
  <description>Mgmt-plane touch from NON-trusted source $(srcip)</description>
</rule>
```
Declare the list in ossec.conf `<ruleset><list>etc/lists/trusted-admins</list></ruleset>` and rebuild is automatic on restart (v 4.x).

## MITRE tagging discipline

Every custom detection rule that represents attacker behavior gets `<mitre><id>TXXXX</id></mitre>`. This is not decoration: the dashboard MITRE view aggregates by these tags, and an untagged custom ruleset makes that view lie by omission. Common mappings: scans T1046, brute force T1110, lateral movement to mgmt plane T1021, exfil attempts T1041, C2 beaconing T1071.

## Storage and retention

- Alerts indices roll daily (`wazuh-alerts-4.x-YYYY.MM.DD`). Retention = index lifecycle: delete old indices via ISM policy (v, dashboard Index Management) or curator-style cron.
- Size planning: endpoint fleets run 0.5-2 GB/day per 100 agents at sane alert levels (very rough (v); network-device block streams can dwarf that if every block alerts, another reason for the level-0 + aggregate pattern).
- Archives (logall) only ever for diagnosis windows or a compliance mandate with disk budgeted.

## Active response (use sparingly)

Manager-triggered scripts on agents (firewall-drop, account-disable). Reserve for level 13+ with low false-positive confidence; a mistuned active response is a self-inflicted DoS. Always start with `<active-response><level>13</level><timeout>600</timeout></active-response>` timeboxed drops, never permanent, and allowlist your own management sources first (CDB above).
