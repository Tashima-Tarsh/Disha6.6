# Graylog Troubleshooting Runbook (symptom-indexed)

Version specifics (v) checked against Graylog 7.1.x, 2026-08-15.

## "Nothing is arriving"

1. Input state: System > Inputs: RUNNING and the throughput/metrics counter incrementing? A FAILED input names its bind error right there.
2. Bind privilege: ports <1024 fail for unprivileged graylog-server (v). Symptom in journalctl: permission denied on bind. Fix: use 1514+, or systemd socket/setcap if 514 is mandatory.
3. Wire: `tcpdump -i any -n udp port 1514 -c 5`. Nothing = sender config or path firewall. Something = input/host mismatch (wrong bind address, container port mapping, host firewall).
4. Journal vs search: System > Overview: if "unprocessed messages" grows, ingestion works and OpenSearch is behind (see journal section).
5. Timezone illusion: messages ARE there but the search window misses them: device clock skew or wrong input timezone parses timestamps into the past/future. Search absolute all-time for the source IP to confirm before chasing ingestion ghosts.

## "Journal utilization climbing / journal full"

The disk journal buffers between inputs and OpenSearch. Climbing utilization = output side cannot keep up:
- OpenSearch health: `curl -s localhost:9200/_cluster/health?pretty`. Red = usually disk watermarks (~85/90/95% (v)) or unassigned shards.
- Disk full on the OpenSearch data path is the #1 cause. Free space, then clear read-only blocks:
  `curl -s -X PUT localhost:9200/_all/_settings -H 'Content-Type: application/json' -d '{"index.blocks.read_only_allow_delete": null}'`
- Heap pressure: OpenSearch heap should be ~half RAM up to ~31GB (v); GC storms show in opensearch logs.
- Output batch tuning (server.conf `output_batch_size` (v)) only after the above are clean.
- Journal itself sizes via `message_journal_max_size` (v, default 5GB): raise it for burst tolerance, but a bigger journal only buys time, it does not fix a slow store.

## "Pipeline rule never matches"

- Simulator first (Pipelines > Simulate): paste a real message, watch stage-by-stage.
- Processing order (v): System > Configurations > Message Processors: Pipeline Processor must run after Message Filter Chain when the pipeline connects to streams that static stream rules populate. Wrong order = rule tests true in simulator, never fires live. The classic.
- Field presence: `has_field()` guards; a grok that fails leaves fields unset silently.
- Stream connection: pipelines fire only for messages in their CONNECTED streams. All Messages connection is the catch-all during development.

## "Search is slow"

- Shard count explosion: many small index sets rotating daily = thousands of shards; each shard costs heap. Consolidate index sets, lengthen rotation, or shrink retention. Target <20 shards/GB heap (v rule of thumb).
- Wide time ranges over unfiltered All Messages: teach stream-scoped searching.
- OpenSearch heap (above).

## "Index set red / rotation errors"

- `curl -s localhost:9200/_cat/indices?v | grep -v green`: identify the sick index.
- Unassigned shards on single node with replicas configured: set replicas 0 for the index set (single-node estates (v)).
- Rotation failures log in server.log; usually disk or a deflector alias conflict: System > Indices > Maintenance > Recalculate index ranges fixes range metadata after manual surgery.

## "Alerts not firing"

- Event definition backlog: Alerts > Event Definitions: check "last executed"; the events engine polls (v default 1m).
- Aggregation windows need the FIELD to exist: verify the pipeline sets it before the event queries it.
- Notification failures are separate from event creation: check Alerts > Notifications test button and server.log for SMTP/webhook errors.

## "It was working, stopped at time X"

Order: disk (both Graylog journal path and OpenSearch data path), certificate expiry (if TLS between components), device firmware changed log format (pipelines silently stop extracting: re-capture samples and re-simulate), input port collision after another service restart, and heap/GC death spiral in opensearch logs.
