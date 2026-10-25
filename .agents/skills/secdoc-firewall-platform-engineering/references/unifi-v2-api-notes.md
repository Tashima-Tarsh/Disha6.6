# UniFi Network v2 API field notes

Proven against a UniFi Enterprise Fortress Gateway, UniFi OS / Network 9.x, 2026-08. All marked (v): re-verify on newer releases.

## Endpoints

X-API-Key header auth works for both classic and v2 paths on current UniFi OS.

- ZBF policies: `/proxy/network/v2/api/site/default/firewall-policies` — the classic `rest/firewallpolicies` returns `api.err.InvalidObject` on ZBF gateways
- Zones: `/proxy/network/v2/api/site/default/firewall/zone` (not `firewall-zones`, not `firewall/zones`)
- Zone matrix: `.../firewall/zone-matrix`
- Classic API still serves: `rest/firewallgroup`, `rest/portforward`, `rest/networkconf`, `get/setting`, `stat/*`

## Schema pitfalls (each cost a failed call)

1. **Destination ports**: singular `port` as comma string (`"22,80,443,5900-5901"`), NOT a `ports` array. Wrong shape -> `api.err.MissingFirewallDestinationPort`.
2. **Zone PUT**: send only writable fields (`_id`, `name`, `network_ids`). Echoing back GET-returned fields like `attr_no_edit`, `default_zone`, `zone_key` -> JSON parse error, unrecognized field.
3. **Network-object source scoping** (`matching_target: NETWORK` + `network_ids`) is rejected with `FirewallPolicyNetworkDoesNotExist` when the referenced network is not yet a member of the policy's source zone. To pre-stage rules ahead of a zone move, scope by CIDR instead: `matching_target: IP`, `ips: ["192.168.88.0/25"]`.
4. **RESPOND_ONLY return policies cannot be created directly**, and `create_allow_respond: true` is rejected on POST (and on later PUT for some zone pairs) with `FirewallPolicyCreateRespondTrafficPolicyNotAllowed`. Two working paths:
   - PUT `create_allow_respond: true` onto an existing initiating policy; the controller auto-generates the `(Return)` RESPOND_ONLY partner at idx 30000+
   - Create an explicit CUSTOM-state policy: `connection_state_type: "CUSTOM"`, `connection_states: ["ESTABLISHED","RELATED"]`
5. **Cascade deletes**: deleting a custom policy can silently delete its controller-generated `(Return)` partner. Return policies are load-bearing in ZBF: without one, replies from the far zone fall to Block All and sessions half-open (SYN reaches target, SYN-ACK dies on the way back; the block counter climbs at roughly 2x the allow counter — that ratio is the diagnostic signature). After any policy surgery, verify BOTH directions of every affected zone pair.
6. **Hit counters** (`hits`, `last_hit`) reset on reprovision/reboot. Never declare a rule dead from zero hits without a baseline window across confirmed gateway uptime. (Verified persistent across a reboot on Network 10.6.94 / EFG — but confirm per-build before trusting.)
7. **Policy `index` is not API-writable** (v, Network 10.6.94): PUT with a changed `index` returns HTTP 200 but silently keeps the old value; `PUT /firewall-policies/batch` behaves the same. Rule reorder is UI-drag only. Beware the lying 200 — always read back `index` after any reorder attempt.
8. **Predefined pair-default policies are synthetic**: not addressable via GET/PUT by `_id` (404 FirewallPolicyNotFound on the composite id). To override a pair default (e.g. kill a predefined Allow All egress), create an explicit scoped-allow set followed by an any/any BLOCK at a custom index above 30000-range returns — the tail-block pattern. Place tail-blocks ABOVE the pair's RESPOND_ONLY `(Return)` policies only if you intend to kill returns too; normally index them after returns (e.g. 31000) or you recreate the half-open failure.

9. **`logging` is a per-policy boolean, but only writable on real (non-synthetic) policies.** Custom user rules (index < 30000) toggle logging fine via API: GET the policy, set `logging: true`, PUT the FULL object back, then read back `logging` to confirm. Verified 2026-08-16 on the EFG across 4 custom BLOCK rules. The synthetic policies from pitfall 8 — pair-default `Block All` (index `2147483647`) and 30000+ auto-return/system rules — carry a `logging` field in the GET-all listing but 404 on GET/PUT by their composite `_id`, so their logging CANNOT be flipped via API. To log default-deny (the highest-value firewall signal for a SIEM), use the UI: **Settings > Security > Firewall > Zone Matrix**, open the zone-pair cell, enable the **Log** toggle on the default Block, Apply. There is no v2 endpoint for it: `/firewall/settings`, `/settings/firewall`, and the `zone-matrix` GET all lack a writable per-pair log flag (checked 2026-08-16, Network 9.x/EFG). After the user toggles in UI, re-GET `/firewall-policies` and read `logging` on the `2147483647` pair-defaults to verify — the field DOES update there and is API-readable even though it is not API-writable.

## Enabling block-logging for a SIEM (field-tested workflow)

Goal: get every DENY/BLOCK decision into syslog so a SIEM (Wazuh, Graylog) sees it. Two tiers, two methods:

- **Custom BLOCK rules (index < 30000): API.** Loop GET -> set `logging=true` -> PUT full object -> read-back. Do the lowest-hit rule first as a canary to confirm the PUT shape before touching high-volume rules.
- **WAN/default-deny pair-defaults (index 2147483647): UI zone-matrix Log toggle only** (synthetic, see pitfall 9).

Volume caution: WAN INGRESS default-deny (`External -> *`) logs every unsolicited inbound internet packet — constant background-scan noise, high SIEM volume. WAN EGRESS default-deny (`* -> External`) is lower volume, higher signal (especially `Management -> External`, which should almost never fire). Recommend egress-first, then add ingress selectively if disk/alert budget allows.

Downstream decoder dependency (Wazuh): the `unifi-traffic` decoder prematch requires a `DESCR="..."` field in the line (`[<tag>] DESCR="<text>" IN=`). CONFIRMED 2026-08-16 on the EFG: UniFi emits DESCR on every firewall line including synthetic pair-defaults (e.g. `[WAN_LOCAL-D-2147483647] DESCR="[WAN_LOCAL]Block All Traffic"`), so UI-enabled pair-default logging does produce alerts (deny -> rule 110102 L5). If a future/other build emits lines without DESCR they decode to nothing — confirm per build. See the wazuh skill's unifi-integration reference.

## Zone-move discipline (lockout-safe ordering)

1. Create scoped allows FIRST, before any network moves. Include intra-zone: custom zones default to Block All intra-zone (unlike Internal's Allow All), so members of the new zone cannot talk to each other until an intra-zone allow exists.
2. Move networks one at a time, live-verifying between moves.
3. Move the segment carrying your own management/UI/API session LAST, and pre-stage its egress, to-Internal, and return policies by CIDR before that move.
4. Rollback for any move is one PUT removing the network id from the zone's `network_ids`.
5. ICMP is not covered by tcp_udp port allows: ping/tracert into a locked zone fails by design even when TCP management works. Decide explicitly whether to allow ICMP; do not let a failed ping be mistaken for a broken ruleset — check hit counters instead (allow counter moving = traffic passing).

## Diagnostic flow for "cannot reach X through the gateway"

1. Pull the zone-pair policies and read hit counters before touching anything.
2. All counters zero (including blocks) = traffic never reaches the gateway: routing/L2 problem or wrong source segment, not policy.
3. Block counter climbing = arrives and is denied: identify the matching gap (wrong source network, missing port, ICMP).
4. Allow climbing AND block climbing ~2x = return-path failure (see pitfall 5).
