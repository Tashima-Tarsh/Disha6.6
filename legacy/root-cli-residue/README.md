# Historical CLI residue

These five TypeScript files and the old MCP registry manifest remained at the repository root after the CLI was archived. Their imports refer to removed root modules and there is no root package/build entrypoint. They are retained here without rewriting or publishing the unsupported CLI.

The active product is `web/`, with the optional governed Python runtime in `disha/brain/`. The fuller historical source lives in `disha/legacy-root-src/`. This directory is not deployed, imported by the web application, or advertised as a working MCP server.
