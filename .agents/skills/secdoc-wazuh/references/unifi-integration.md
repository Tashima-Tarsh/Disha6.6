# UniFi -> Wazuh Integration (end to end)

Durable pipeline mechanics stated as fact; menu paths and formats marked (v), checked 2026-08-15 against UniFi Network 9.x-10.6.x and Wazuh 4.14.x.

## 1. Sender side (UniFi gateway)

Settings > Control Plane > Integrations > Activity Logging / SIEM Server (v). Set the Wazuh host IP and port, UDP (UniFi is UDP-only (v)). Enable content categories deliberately:

- `firewall_default_policy`: zone-block hits (the ZBF default-deny events). High value.
- `security_detections`: IPS/IDS alerts. High value.
- `gateway`, `vpn`, `admin_activity`, `critical`, `device`, `client`, `triggers`, `updates`: enable per need; `client` is chatty (connect/disconnect per client).

Verify the gateway config via API if driving programmatically: `get/setting` key `rsyslogd` shows `ip`, `port`, `enabled`, `contents[]`.

Multi-interface caveat: the gateway sources syslog from the interface routing toward the collector, not necessarily its management IP. Confirm actual source with tcpdump on the collector before writing allowed-ips.

## 2. Receiver side (Wazuh manager)

```xml
<remote>
  <connection>syslog</connection>
  <port>514</port>
  <protocol>udp</protocol>
  <allowed-ips>192.168.2.0/24</allowed-ips>  <!-- must cover the gateway's SOURCE ip -->
</remote>
```

Restart wazuh-manager. Confirm arrival: `tcpdump -i any -n udp port 514 -c 5`. Confirm read: enable `<logall_json>yes</logall_json>` briefly and grep archives.json for the gateway IP.

## 3. What UniFi log lines look like (v, format drifts between releases)

Zone-block lines from firewall_default_policy resemble:

```
<4>Aug 16 02:10:11 VOID-EFG kernel: [ZBF-DEFAULT-D-4] IN=br10 OUT=br4 MAC=... SRC=192.168.10.17 DST=192.168.4.2 LEN=60 ... PROTO=TCP SPT=51234 DPT=443
```

Key fields: the bracket tag names the matched rule chain (drifts by release: some builds emit descriptive rule names, ZBF builds emit chain tags), IN/OUT bridge interfaces map to VLANs, SRC/DST/PROTO/SPT/DPT carry the flow.

IPS lines from security_detections resemble Suricata EVE-ish text with signature id and category.

Always capture real samples from archives.json before writing decoders; do not trust this reference's examples as your build's exact format.

## 4. Local decoder skeleton for kernel-style block lines

```xml
<!-- /var/ossec/etc/decoders/local_decoder.xml -->
<decoder name="unifi-zbf">
  <program_name>kernel</program_name>
  <prematch>\[ZBF-</prematch>
</decoder>

<decoder name="unifi-zbf-fields">
  <parent>unifi-zbf</parent>
  <regex>IN=(\S*) OUT=(\S*) .*SRC=(\S+) DST=(\S+) .*PROTO=(\S+)(?: SPT=(\d+) DPT=(\d+))?</regex>
  <order>in_iface, out_iface, srcip, dstip, protocol, srcport, dstport</order>
</decoder>
```

Validate with wazuh-logtest: paste a real line, confirm the fields extract. srcip/dstip as decoded field names unlock Wazuh's built-in field logic (CDB lookups, `<same_source_ip>` correlations).

## 5. Rules: make blocks visible, alert on storms

```xml
<!-- /var/ossec/etc/rules/local_rules.xml -->
<group name="unifi,firewall,">
  <rule id="100200" level="3">
    <decoded_as>unifi-zbf</decoded_as>
    <description>UniFi ZBF: blocked $(protocol) $(srcip):$(srcport) -> $(dstip):$(dstport)</description>
    <group>firewall_block,</group>
  </rule>

  <!-- storm: same source blocked 30x in 60s -->
  <rule id="100201" level="10" frequency="30" timeframe="60">
    <if_matched_sid>100200</if_matched_sid>
    <same_source_ip />
    <description>UniFi ZBF: block storm from $(srcip) (possible scan/beacon)</description>
    <mitre><id>T1046</id></mitre>
  </rule>

  <!-- management-plane touch attempts get elevated -->
  <rule id="100202" level="8">
    <if_sid>100200</if_sid>
    <dstip>192.168.4.0/28, 192.168.6.0/28</dstip>
    <description>UniFi ZBF: blocked attempt to management plane $(dstip)</description>
    <mitre><id>T1021</id></mitre>
  </rule>
</group>
```

Level 3 makes every block an alert (visible in dashboard); if volume is too high, drop 100200 to level 0 and keep only 100201/100202 alerting: blocks remain countable via archives while the dashboard stays signal-only.

## 6. Validation loop

1. Trigger a known block (from a USER host, attempt a port you know the zone matrix denies).
2. `wazuh-logtest` a captured line: decoder + rule fire as expected.
3. Dashboard: Threat Hunting / Security events, filter `rule.groups: firewall_block`, confirm the event.
4. Only then tune levels and storms.

## 7. Field-validated reality: the DESCR dependency (checked 2026-08-16, EFG + Network 9.x)

The kernel/ZBF skeletons in sections 3-5 are one possible format. A real EFG in
the field was NOT emitting kernel/ZBF chain-tag lines. Its actual firewall syslog
looks like this (captured from archives.json), and a different decoder handles it:

```
Aug 15 00:00:00 VOID-EFG VOID-EFG [LAN_WAN-A-10027] DESCR="ALLOW OUT - INTERNET WEB" IN=br40 OUT=eth2 MAC=... SRC=192.168.40.202 DST=17.248.195.56 ... PROTO=TCP SPT=52131 DPT=443 ...
```

The deployed decoder family is `unifi-traffic` (file `unifi_traffic_decoders.xml`),
whose PREMATCH is: `\[\S+\] DESCR="[^"]*" IN=`. Field order on the tcp/udp child:
`unifi_fw_rule, unifi_fw_descr, srcip, dstip, protocol, srcport, dstport`.

Critical dependency: **the decode hinges on a `DESCR="..."` field being present.**
Verified via /logtest against this decoder:

| Line shape | Decoder | Rule | Alert |
|---|---|---|---|
| `[TAG] DESCR="name" IN=...` (named block) | unifi-traffic | 110102 L5 | YES |
| `[TAG] DESCR="" IN=...` (empty descr) | unifi-traffic | 110100 L0 | no (grouping only) |
| `[TAG] IN=...` (no DESCR field) | NONE | none | INVISIBLE |

On the EFG build tested, ALL lines including synthetic pair-defaults carry a
non-empty DESCR, so the "empty" and "no DESCR" rows did not occur in practice —
they are the failure modes to watch for if a future build changes format.

Consequence for default-deny logging: when you enable logging on UniFi WAN
pair-default "Block All" rules (via the zone-matrix UI Log toggle — they are
synthetic and not API-writable; see firewall-platform-engineering
unifi-v2-api-notes pitfall 9), the newly-logged lines DO decode. CONFIRMED
2026-08-16 against real archives.json: UniFi emits DESCR on every line including
the synthetic pair-defaults. A real pair-default carries a composite tag and a
bracketed zone descr, e.g.:

```
[LOCAL_WAN-A-2147483647] DESCR="[LOCAL_WAN]Allow All Traffic" ...   -> rule 110101 L0 (allow, suppressed)
[WAN_LOCAL-D-2147483647] DESCR="[WAN_LOCAL]Block All Traffic" ...   -> rule 110102 L5 ALERT
```

Both the `-A` (allow) and `-D` (deny) pair-defaults decode via unifi-traffic, and
the deny fires 110102 at level 5 (verified via logtest). So enabling pair-default
logging in the UI does produce dashboard alerts on this build. If a DIFFERENT
UniFi build emits default-deny lines WITHOUT DESCR (test yours), the decoder
drops them silently — add a sibling child decoder to unifi-traffic whose regex
does not require DESCR (match on `\[(\S+)\].*?SRC=(\S+) DST=(\S+)`), ordered
AFTER the DESCR-bearing children (sibling decoders are first-match-wins), and a
rule keyed to the block tag pattern. Validate with logtest before restart.

Bonus confirmed in the same capture: correlation rule 110103 (L10, "repeated
firewall blocks from same source", MITRE T1046) fired against a real external
source hammering a port-forward, so the storm/scan-detection layer works end to
end on top of 110102.

Rule reference (this build's unifi-traffic rules):
- 110100 L0 grouping, 110101 L0 allowed-traffic **suppressed** (allows are ~99%
  of volume, deliberately archive-only), 110102 L5 **blocked traffic alerts**.
  Confirm 110101 suppression matches your intent: allowed traffic will NOT appear
  in the dashboard by design, only in archives.

Note: archives.json is NOT readable through the Server API (only ossec.log via
/manager/logs). To capture a real line you need shell on the manager, or working
Indexer (9200) creds to query wazuh-archives-*. /logtest over the API validates
any line you can hand it, which is enough to prove or fix a decoder remotely.

## 8. Deploying rules/decoders via API: the 1113 pitfall (field-tested 2026-08-16)

`PUT /rules/files/<name>` and `PUT /decoders/files/<name>` upload custom content.
Content-Type MUST be `application/octet-stream` (text/plain and application/xml
return 415). On Wazuh 4.14.5 this endpoint returned `code 1113 "XML syntax error"`
for EVERY upload, including a file GET-read straight off the box and PUT back
unchanged, and a minimal textbook-valid rule. Reproduced via curl and Python
requests, LF and CRLF, all content-types. It is a server-side validation defect
on that build, not a client or content problem. When you hit it:

- Do NOT keep reformatting XML; a round-trip of a known-good file proves it is
  not your content.
- Deploy file-based instead: place the file in `/var/ossec/etc/rules/` (or
  `/etc/decoders/`) on the manager, register any CDB `<list>` in `ossec.conf`
  `<ruleset>`, then `/var/ossec/bin/wazuh-control restart`.
- These endpoints DO work regardless of the rules-upload bug: `PUT /lists/files/<name>`
  (CDB lists), `GET` of any rule/decoder (`?raw=true&relative_dirname=etc/rules`),
  `PUT /logtest` (validation), and the dashboard saved-objects API on 443.

So the remote workflow is: author locally -> validate the LOGIC with /logtest
(paste representative lines) -> if the API upload 1113s, hand the file to someone
with shell (or drop it yourself) -> restart -> re-verify with /logtest.

## 9. GeoIP + dashboards via API (field-tested 2026-08-16)

GeoIP: modern Wazuh builds enrich public source IPs automatically. Check before
assuming you must configure it: query the indexer for `GeoLocation.location`
(a geo_point) on recent alerts:
`POST wazuh-alerts-*/_search {"query":{"exists":{"field":"GeoLocation.location"}}}`.
Enriched alerts carry `GeoLocation.country_name`, `.city_name`, `.region_name`,
and `.location` (lon/lat). RFC1918 internal IPs are not geo-located (expected),
so a source-IP map naturally plots external/hostile traffic, which is what you want.

Dashboards: the OpenSearch Dashboards saved-objects API (port 443, header
`osd-xsrf: true`, indexer creds) builds and imports dashboards programmatically:
- `POST /api/saved_objects/_import?overwrite=true` with a multipart NDJSON file
  (one JSON object per line: index-pattern refs, visualizations, then dashboard).
- `POST /api/saved_objects/_export` with `{"objects":[...],"includeReferencesDeep":true}`
  to pull a dashboard + all children back out as NDJSON for version control.
Visualizations reference the stock `wazuh-alerts-*` index-pattern by id. Geo panel
types: `region_map` (choropleth by country, join field iso2), `tile_map`
(coordinate/geohash markers on `GeoLocation.location`), and a `table` agg on
`data.srcip` + `GeoLocation.city_name`/`.country_name` for an IP-location listing.
Verified: 8-panel "UniFi WAN Threats" dashboard built and populated (2172
geo-enriched blocked alerts/24h) entirely over the API.

### Saved-object visState pitfalls (each cost a broken panel, fixed 2026-08-16)

1. **Table columns need `schema: "bucket"`, NOT `"segment"`.** A `type: table`
   visualization whose terms agg uses `schema: "segment"` renders ONLY the metric
   (Count) column; the bucket field (srcip, rule.description) silently does not
   appear. `segment` is for axis-based charts (histogram, horizontal_bar, pie).
   For tables always use `schema: "bucket"`. Symptom: a table showing just numbers
   with no label column.
2. **`region_map` join field must match the data's key format.** The default
   `selectedJoinField: {"name":"iso2"}` joins on 2-letter country CODES (US, FR).
   Wazuh GeoIP populates `GeoLocation.country_name` with FULL names
   (United States, France). Feeding full names to an iso2-join map matches nothing
   and the map renders blank. Either join on a field that emits iso2, or (more
   robust) drop the region_map entirely and use a `horizontal_bar` on
   `GeoLocation.country_name` — it needs no external vector layer. region_map also
   depends on an external EMS vector-layer service (maps.opensearch.org /
   vector.maps.elastic.co) that is often unreachable on a lab/air-gapped box, a
   second reason to prefer the bar chart. The `tile_map` (coordinate dots on
   `GeoLocation.location`) needs only OSM tiles and works where region_map fails.
3. **Export leaks the host URL.** `_export` embeds the dashboard host origin
   (e.g. `https://<manager-ip>`) in a `parsedUrl` metadata field of saved objects.
   Harmless on import (rewritten), but scrub it before committing an export to a
   public repo. Chart data is NOT in the export (config only), but this one URL is.
