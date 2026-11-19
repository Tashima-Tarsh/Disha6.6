# DISHA 6.6 — VYUHA Defense Universe

## Scope

The visualization at `/vyuha-cinema` is a **cinematic, non-operational representation** of eight formation identifiers from `backend/vyuha_formations.py` and `web/app/api/osint/vyuh/formations/route.ts`. It is not a substitute for the governed twelve-record Brain selector or the separate YAML skill rules.

- `web/components/vyuha/formation-catalog.ts` provides public presentation metadata. Keep its IDs synchronized with the standalone backend catalog.
- `web/components/vyuha/VyuhaCanvas.tsx` procedurally renders 3D geometry using the existing `three` dependency. No remote video, generation API, private identity data, or external resources are required.
- `web/components/vyuha/VyuhaCinema.tsx` offers the six-stage simulated narrative, camera selector, pause/play, auto-cycle, and formation switching.
- `web/app/vyuha-cinema/page.tsx` is the viewer route. The login page uses a decorative ambient version of the formation renderer while keeping its authentication logic unchanged.

## Cinematic language

- Chakra: rotating, nested perimeter rings.
- Padma: oscillating radial petals and layered containment.
- Garuda: mirrored sensor wings.
- Surya: radiating graph-anomaly field.
- Nakshatra: orbital constellation.
- Sarvatobhadra: enclosed cubic protective geometry.
- NYAYA: paired evidence columns and review bridge.
- SETU-VARUNA: mirrored resilience corridors.

Camera positions include slow orbit, overhead, and side view. The mission stages are DETECT → CLASSIFY → FORM → SHIELD → PRESERVE → REVIEW. All phase text and displayed signals are simulated story elements, never live measurements or verified findings.

## Defense boundaries

The component performs no outbound requests and never calls `/api/v1/vyuha/activate` or `/api/osint/vyuh/activate`. Real policy gating, human approval, audit and evidence promotion remain in the existing server-side systems. Do not replace those protections with client state or present a cinematic phase as an executed response.

## Accessibility and performance

The renderer caps device pixel ratio, limits background animation to about 30 FPS, avoids allocating geometry every frame, pauses while the document is hidden, releases GPU resources on unmount, and provides a static fallback if WebGL initialization fails. It honors reduced-motion preferences by disabling camera and formation motion. Formation selection, camera presets and play/pause use conventional accessible controls.

## Verification

Run from `web/`:

```bash
npm run test -- formation-catalog
npm run type-check
npm run build
```

Then inspect `/vyuha-cinema` at mobile and desktop widths and `/login` with WebGL enabled, disabled and reduced motion enabled. The cinematic viewer is not a production security system test.
