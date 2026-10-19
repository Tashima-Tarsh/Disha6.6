# DISHA desktop interface

The web application uses a light desktop shell on the existing authenticated routes. No route URLs, authentication policies, database schemas or backend service contracts were changed by this redesign.

## Interaction model

- Start opens a modal launcher with pinned applications and searchable catalogue entries. Escape closes it and restores focus to Start.
- Ctrl+Space toggles Start. Ctrl+K focuses taskbar search.
- Taskbar search opens the existing investigation route with an encoded query. It does not execute a target search automatically.
- The active workspace can be minimized, restored and maximized. Returning to the desktop keeps the workspace mounted. Switching routes retains the application's existing navigation and session lifecycle; it is not a persistent multi-process operating system.
- DISHA AI uses the existing authenticated `/api/chat` endpoint. The model selector discovers installed local models from `/api/v1/runtime/models/catalog`; installation alone is not proof of a successful response. Unreadable response payloads produce an explicit error.
- Tool windows use the existing vehicle or OSINT lookup APIs. They require an entered target and a lawful-purpose confirmation. Service responses are displayed as returned, without fabricated success narratives.
- Sign-out redirects only after the backend confirms success. A failed sign-out leaves a visible error.

## Security and evidence boundaries

Login retains password validation, MFA, OIDC, server-validated return URLs, and same-origin cookies. An invalid MFA attempt leaves the challenge available for retry. No credentials or session tokens are written to browser storage.

The shell health indicator comes from `/api/v1/health`. It describes that endpoint only; it does not certify tool availability. Tool catalogue entries are marked `[VERIFY REQUIRED]` until their runtime evidence is reviewed. Search results, source statuses, timestamps and provenance hashes come from the investigation session. Synthetic map nodes and inferred coordinates are not used in the redesigned investigation screen.

The desktop is a browser application. Only configured services can provide intelligence or model responses. The existing backend tests and live authenticated workflows remain release gates.

## Validation

Run under `web/`:

```
npm run test
npm run type-check
npm run build
npm run type-check:full
```

Also verify login, Start keyboard focus, minimize/restore, maximize/restore, taskbar search, source/evidence views, DISHA AI success/error handling, sign-out, and narrow mobile layouts against the final running build.

The login and desktop include a layered CSS 3D paper sculpture. It uses real perspective and depth transforms without a WebGL runtime or animation loop. Desktop pointer tilt respects reduced-motion preferences; the sculpture is hidden on narrow screens.

Authenticated desktop mutations use the existing CSRF header helper. To avoid concurrent build collisions, set DISHA_NEXT_DIST_DIR=.next-desktop when building or starting this release; Docker accepts NEXT_BUILD_DIR=.next-desktop as a build argument. The default build directory remains .next.
