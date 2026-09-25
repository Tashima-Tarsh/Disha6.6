# disha6.6 Public Page

This folder is the public documentation surface for disha6.6.

It is intentionally separate from the private product runtime, source code, local connectors, credentials, and operational data. GitHub Pages can publish only this folder through `.github/workflows/pages.yml`.

## Publish Boundary

Public:

- Product thesis
- Methodology
- Architecture summary
- Public release notes
- Verification language
- Contact and access request path

Private:

- Source code
- Agent prompts
- Runtime keys
- Connector credentials
- Local databases
- Incident workspaces
- Controlled evidence
- Pentagi/disha6.6 runtime state

## GitHub Pages Visibility Note

GitHub Pages can publish this folder without exposing the full repository contents. However, if the repository is private, public Pages availability depends on the account or organization plan and Pages visibility setting.

If GitHub unpublishes Pages after the repository is made private, keep this repo private and mirror only `docs/public/` into a separate public documentation repository such as `Tashima-Tarsh/disha-public`.

## Local Preview

From the repository root:

```powershell
python -m http.server 8099 -d docs/public
```

Open:

```text
http://127.0.0.1:8099/
```

## Accuracy Rule

Any claim that is not verifiable from repository material or a named public source must be marked `[VERIFY REQUIRED]`.
