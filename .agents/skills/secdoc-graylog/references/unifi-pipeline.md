# UniFi -> Graylog Pipeline (end to end)

Checked 2026-08-15 against Graylog 7.1.x and UniFi Network 9.x-10.6.x; drifting specifics marked (v).

## 1. Input

System > Inputs > Syslog UDP > Launch new input (v). Port 1514 (graylog-server cannot bind <1024 unprivileged (v)). Bind 0.0.0.0, leave "store full message" on during initial integration (off later to save space).

UniFi sender: Settings > Control Plane > Integrations > Activity Logging / SIEM Server (v), target graylog-ip:1514 UDP. Enable `firewall_default_policy`, `security_detections`, `gateway`, `admin_activity` at minimum for a security view.

Verify: input throughput counter moves; `tcpdump -i any -n udp port 1514 -c 5` on the Graylog host if not.

## 2. Pipeline parsing (ZBF block lines)

UniFi kernel-style block lines carry iptables/nftables-ish fields. Create pipeline "unifi", stage 0 rule:

```
rule "unifi: parse zbf block"
when
  contains(to_string($message.message), "SRC=") &&
  (contains(to_string($message.message), "[ZBF-") || has_field("kernel"))
then
  let m = grok(pattern: "IN=%{DATA:in_iface} OUT=%{DATA:out_iface}.*SRC=%{IP:srcip} DST=%{IP:dstip}.*PROTO=%{WORD:proto}(?: SPT=%{INT:srcport} DPT=%{INT:dstport})?", value: to_string($message.message));
  set_fields(m);
  set_field("event_type", "firewall_block");
  set_field("vendor", "unifi");
end
```

Stage 1, tag management-plane targets (adjust CIDRs to estate):

```
rule "unifi: flag mgmt-plane target"
when
  has_field("dstip") &&
  (cidr_match("192.168.4.0/28", to_ip($message.dstip)) || cidr_match("192.168.6.0/28", to_ip($message.dstip)))
then
  set_field("mgmt_plane_target", true);
end
```

Test every rule in the simulator with a REAL captured line before connecting the pipeline. UniFi log formats drift between releases (v); never trust example lines from documentation, including this one.

Processing order check (v): System > Configurations > Message Processors: Message Filter Chain BEFORE Pipeline Processor when pipelines are connected to streams populated by static stream rules.

## 3. Streams and routing

- Stream `unifi-firewall`: rule `event_type must match firewall_block`, own index set (e.g. 30-day retention), remove from All Messages.
- Stream `unifi-ips`: route security_detections lines (match on their signature format after capturing samples).
- Stream `unifi-admin`: admin_activity lines; long retention (audit trail).

## 4. Alerting (Event Definitions)

Block storm, aggregation event (v UI path Alerts > Event Definitions):
- Condition: aggregation on stream `unifi-firewall`, `count() > 50`, group by `srcip`, window 5m.
- Mgmt-plane touches: filter condition `mgmt_plane_target:true`, threshold >0, window 1m: any blocked attempt at the management plane raises an event.
- Notification: email or webhook. Webhook to a Hermes agent endpoint or ntfy makes a lightweight pager.

## 5. Forwarding security streams to Wazuh (single-syslog-target devices)

UniFi ships to one syslog destination (v). To feed both platforms, Graylog fans out:
- System > Outputs (v): Syslog output plugin (or GELF-to-relay where the plugin is unavailable in your build; the Syslog output ships in graylog-integrations (v)); target wazuh-manager:514 UDP.
- Attach the output to `unifi-firewall` and `unifi-ips` streams only: Wazuh gets security-relevant traffic, not the whole firehose.
- On the Wazuh side, allowed-ips must cover the GRAYLOG host now (it is the sender), and messages arrive with Graylog's reserialization: capture a forwarded sample and re-run wazuh-logtest, decoders keyed on the original framing may need a variant.

Alternative when the output plugin path is awkward: keep the platforms split by role: Graylog = search/retention/dashboards, Wazuh = endpoint agents only, and skip device-log forwarding to Wazuh entirely. Blocks are visible in Graylog dashboards and alerting either way; you lose only Wazuh-side correlation of device events with endpoint events.

## 6. Dashboard starter (security view)

Widgets on stream `unifi-firewall`: message count over time (stacked by action if parsed), top srcip table, top dstport table, mgmt_plane_target:true count with threshold coloring, geo map of external srcip (GeoIP processor (v): System > Configurations > Geo-Location Processor, needs a MaxMind DB). Pair with `unifi-ips` widgets for signature/category tops.
