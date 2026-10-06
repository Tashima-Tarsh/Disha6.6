# OSINT Upstream Source Trees

This directory contains the **actual upstream Git repositories** used or evaluated by DISHA 6.6. They are tracked as Git submodules so the source remains attributable to the original project, pinned to an exact reviewed commit in the DISHA superproject, and can be synchronized with upstream without copying anonymous snapshots.

A submodule being present here means its source is available to the DISHA checkout. It does **not** by itself mean every capability is automatically executable in production. Runtime execution continues to go through DISHA adapters, policy gates, worker isolation, credentials, and per-tool smoke tests.

| Directory | Upstream | Tracked branch | DISHA runtime |
|---|---|---|---|
| `phoneinfoga/` | sundowndev/phoneinfoga | master | ASTRA identity worker |
| `sherlock/` | sherlock-project/sherlock | master | ASTRA identity worker |
| `maigret/` | soxoj/maigret | main | ASTRA identity worker |
| `holehe/` | megadose/holehe | master | ASTRA identity worker |
| `instaloader/` | instaloader/instaloader | master | ASTRA identity worker |
| `Telethon/` | LonamiWebs/Telethon | v1 | Telegram public metadata worker |
| `theHarvester/` | laramies/theHarvester | master | ASTRA infrastructure worker |
| `amass/` | owasp-amass/amass | main | ASTRA infrastructure worker (passive profile) |
| `subfinder/` | projectdiscovery/subfinder | dev | ASTRA infrastructure worker |
| `spiderfoot/` | smicallef/spiderfoot | master | source present; runtime promotion requires isolated compatible worker |
| `IntelOwl/` | intelowlproject/IntelOwl | master | source present; service connector candidate |
| `opensanctions/` | opensanctions/opensanctions | main | source present; DISHA uses configured API/data connector separately |
| `opencti/` | OpenCTI-Platform/opencti | master | source present; service connector candidate |
| `recon-ng/` | lanmaster53/recon-ng | master | source present; module-by-module runtime review |
| `Photon/` | s0md3v/Photon | master | source present; direct crawling stays outside passive default |
| `awesome-osint/` | jivoi/awesome-osint | master | source/reference index |

## Initialize

```bash
bash scripts/sync-osint-upstreams.sh --init
```

## Verify exact pinned source

```bash
bash scripts/sync-osint-upstreams.sh --check
```

## Bring working trees to the configured upstream branches

```bash
bash scripts/sync-osint-upstreams.sh --remote
```

After `--remote`, review the resulting submodule pointer changes and commit them in DISHA. Production should always deploy a committed/pinned superproject revision rather than floating directly on upstream HEAD.
