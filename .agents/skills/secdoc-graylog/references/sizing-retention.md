# Graylog Sizing, Index Sets, and Retention Design

Rules of thumb marked (v) reflect Graylog 7.x-era guidance, checked 2026-08-15. Measure your own estate; these are starting points.

## Index set design (durable principles)

- One index set per retention class, not per source. Streams route INTO index sets; many streams can share one.
- Typical security estate classes: `hot-security` (auth, firewall, IPS: 30-90d), `audit` (admin activity, config changes: 180-365d+ per compliance), `bulk` (chatty infra/app logs: 7-14d), `default` (catch-all: short).
- Rotation: time-based P1D is the workhorse; size-based (e.g. 10-20GB target per index (v)) suits very high-volume sets. Retention = max number of indices; P1D x 30 indices = 30 days.
- Single-node: replicas 0 (replicas can never assign, cluster sits yellow forever and wastes intent).

## Shard budget (the hidden constraint)

Every shard costs OpenSearch heap. Rule of thumb (v): <= 20 shards per GB of heap; keep individual shards 10-50GB. Daily rotation x many index sets x default 4 shards (v) explodes fast: set shards=1 for small index sets. Symptoms of shard debt: slow searches, long restarts, heap pressure with modest data volume.

## Heap and hardware anchors (v)

- OpenSearch heap: 50% of box RAM, capped ~31GB (compressed oops boundary). Graylog server heap: 1-2GB small estates, 4GB+ under heavy pipelines.
- Ingest anchors (very rough): a modest 4-vCPU/16GB single node handles 1-3k msg/s sustained with sane pipelines. Grok-heavy parsing is CPU-bound; measure process buffer utilization (System > Nodes > metrics) before scaling hardware.
- Journal: `message_journal_max_size` default 5GB (v); size to cover your longest tolerable OpenSearch outage at peak msg/s x avg message size.

## Volume estimation worksheet

msg/s x avg stored bytes (raw + fields + index overhead ~1.5-2x raw (v)) x 86400 = daily bytes/set. Example: UniFi firewall blocks at 50 msg/s, 600B stored = ~2.6GB/day; 30-day hot = ~78GB before replicas. Do this per index set, sum, add 30% headroom, and check against the disk watermarks (~85% soft limit means usable disk is ~0.8 x raw).

## Cost levers, in order of impact

1. `drop_message()` in pipelines for noise you will never search (health-check chatter, duplicate debug). Dropped before indexing = free.
2. Shorter retention on bulk classes.
3. "Store full message" off on parsed inputs (the extracted fields remain searchable; the raw duplicate goes).
4. Fewer/larger indices (shard budget above).
5. Enterprise archiving to object storage (v, paid) only after 1-4 are exhausted.

## Retention compliance notes

Map index-set retention to actual obligations, not vibes: PCI DSS 10.5.1 wants one year of audit trail (3 months immediately available) (v); pick the classes that carry auth/admin/audit events and pin them accordingly. Document the mapping in the estate's config repo so an assessor reads intent, not archaeology.
