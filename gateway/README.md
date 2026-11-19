# DISHA 6.6 — cinematic gateway

A separate, static landing page for the DISHA operating system. The main Next.js application under `web/` remains untouched.

## Video upload needed before production

The website references `gateway/media/disha66-gateway.mp4` and `gateway/assets/gateway-poster.webp`. The GitHub connector can only write text, so these binary assets must be added via GitHub upload, git push, or Cloudflare Pages direct upload. Download the complete website ZIP supplied in ChatGPT and copy its `gateway/media/` and `gateway/assets/` files into this repository.

The full ZIP includes the **user-supplied original 1920 × 1080 video**, poster, favicon, mobile styling, HTML and security headers.

## Cloudflare Pages (Git integration)

- Repository: `Tashima-Tarsh/Disha6.6`, branch `main`
- Framework: none / static
- Build command: empty
- Output directory: `gateway`
- Custom domain: `disha6-6.thenitishkr.in`

The initially proposed `disha6_6.thenitishkr.in` contains an underscore. The hyphen variant is compatible with DNS hostnames and HTTPS.

The 'Enter DISHA' action currently navigates to the public DISHA page at `https://thenitishkr.in/disha/`, not a biometric auth service. Eye and heartbeat are visual UI gestures only. Point to a verified login route once an authentication origin is configured.

Deploy status must be checked in Cloudflare Pages; committing these files alone does not publish the custom domain.
