# DISHA 6.6 Public Research Catalogue Installation Plan

Generated: 2026-10-08T18:39:29.095Z

## Operating Rule

Install tools only when they support lawful, authorized research, incident response, forensic validation or public-source documentation. Do not ingest stolen datasets or secrets. Incident documentation repositories remain reference sources unless their license and data provenance are reviewed.

## Integration Phases

1. Reference catalogue: serve `github_master_catalogue.json` through the local DISHA API.
2. Tool review: verify license, maintenance, install method and local smoke command per analysis tool.
3. Sandbox execution: run tools in isolated worker containers with read-only input and no broad host access.
4. Evidence admission: persist only source URL, retrieval timestamp, hash, provenance and operator authorization.
5. Incident data policy: keep breach/incident repositories as source-linked metadata unless the material is lawful and non-sensitive.

## Candidate Priority List

| Priority | Repository | Class | Stars | Installation posture |
| ---: | :--- | :--- | ---: | :--- |
| 1 | [owasp-amass/amass](https://github.com/owasp-amass/amass) | analysis_tool | 15324 | review install instructions |
| 2 | [OpenCTI-Platform/opencti](https://github.com/OpenCTI-Platform/opencti) | analysis_tool | 10111 | review install instructions |
| 3 | [volatilityfoundation/volatility](https://github.com/volatilityfoundation/volatility) | analysis_tool | 8055 | reference only; archived |
| 4 | [MISP/MISP](https://github.com/MISP/MISP) | analysis_tool | 6583 | review install instructions |
| 5 | [volatilityfoundation/volatility3](https://github.com/volatilityfoundation/volatility3) | analysis_tool | 4465 | review install instructions |
| 6 | [Velocidex/velociraptor](https://github.com/Velocidex/velociraptor) | analysis_tool | 4311 | review install instructions |
| 7 | [google/timesketch](https://github.com/google/timesketch) | analysis_tool | 3431 | review install instructions |
| 8 | [sleuthkit/autopsy](https://github.com/sleuthkit/autopsy) | analysis_tool | 3368 | review install instructions |
| 9 | [moj-analytical-services/splink](https://github.com/moj-analytical-services/splink) | analysis_tool | 2462 | review install instructions |
| 10 | [dfir-iris/iris-web](https://github.com/dfir-iris/iris-web) | analysis_tool | 1581 | review install instructions |
| 11 | [vz-risk/VCDB](https://github.com/vz-risk/VCDB) | incident_documentation | 673 | manual review required |
| 12 | [sleuthkit/autopsy_addon_modules](https://github.com/sleuthkit/autopsy_addon_modules) | analysis_tool | 604 | review install instructions |
| 13 | [MISP/misp-modules](https://github.com/MISP/misp-modules) | analysis_tool | 377 | review install instructions |
| 14 | [Velocidex/velociraptor-docs](https://github.com/Velocidex/velociraptor-docs) | analysis_tool | 73 | manual review required |
| 15 | [volatilityfoundation/community3](https://github.com/volatilityfoundation/community3) | analysis_tool | 71 | manual review required |
| 16 | [MISP/misp-packer](https://github.com/MISP/misp-packer) | analysis_tool | 29 | review install instructions |
| 17 | [owasp-amass/docs](https://github.com/owasp-amass/docs) | analysis_tool | 5 | manual review required |

## Required Gates Before Execution

- License compatible with local DISHA use.
- No bundled stolen personal, medical, biometric, financial or authentication data.
- Local smoke test defined and passing.
- Network behavior documented.
- Operator authorization scope recorded.
- Output normalization maps every finding to exact source URL and retrieval timestamp.
