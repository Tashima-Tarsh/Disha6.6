# DISHA 6.6 — Cinematic Login Gateway

The standalone gateway is hosted in `gateway/` within this repository. It is deliberately separate from the original Next.js application in `web/`; no backend routes were replaced.

## Assets — verified on GitHub

- `index.html` — full-screen responsive entrance, with eye/heartbeat tap controls
- `media/disha66-gateway.mp4` — **original 1920×1080 video**, 5,206,183 bytes
- `assets/gateway-poster.jpg` — visual fallback while the video loads
- `assets/favicon.svg` — DISHA icon
- `_headers` — Cloudflare Pages security header configuration

Original video SHA-256:
`bb465ba74a564e92e73cc3809bd140c0615c7a6bac1972dc49d4916aaf9e42a3`

The video upload was reconstructed and checksum-verified in GitHub Actions. Temporary upload chunks were removed after successful assembly.

## Deploy on Cloudflare Pages (Git integration)

1. Connect GitHub repository **Tashima-Tarsh/Disha6.6** to a Cloudflare Pages project.
2. Select production branch `main`.
3. Set framework to **None** (static site).
4. Leave build command **empty**.
5. Set build output directory to **`gateway`** (relative to repository root).
6. In Pages > Custom domains, add **`disha6-6.thenitishkr.in`**, then follow Cloudflare's DNS/SSL verification.
7. Verify HTTPS, MP4 and poster responses, mobile layout, and entrance interaction.

The underscore form `disha6_6.thenitishkr.in` is not recommended as a public website hostname. Use the hyphenated form instead.

**Deployment note:** Files in GitHub do not prove the custom domain is live. A Cloudflare Pages project and custom-domain association must be confirmed separately.

**Entrance action:** The page currently navigates to `https://thenitishkr.in/disha/` after a tap. That destination has not been verified. The eye/heartbeat controls are cinematic UI interactions; they are not biometric authentication.
