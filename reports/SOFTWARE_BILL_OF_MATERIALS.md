# DISHA 6.6 — Software Bill of Materials (SBOM)

**Generated:** 2026-10-25T15:38:36.633Z  
**Application:** DISHA 6.6 Constitutional Evidence & Intelligence Operating System  
**Specification:** CycloneDX 1.5 JSON & GitHub GFM Compatible  
**Total Tracked Components:** 65  

---

## 1. Summary of Ecosystems

| Ecosystem | Scope | Components | Compliance |
| :--- | :--- | :--- | :--- |
| **npm (Node.js / Next.js)** | Production | 41 | Verified permissive (MIT, Apache-2.0, BSD) |
| **npm (Tooling & Testing)** | Development | 16 | Verified development tooling |
| **pypi (Python Brain & OSINT)** | Backend Runtime | 8 | Verified standard Python dependencies |

---

## 2. Core Production Dependencies

| Component Name | Ecosystem | Version Constraint | Scope | License |
| :--- | :--- | :--- | :--- | :--- |
| `@deck.gl/aggregation-layers` | npm | `9.4.0` | production | Permissive/OSS |
| `@deck.gl/core` | npm | `9.4.0` | production | Permissive/OSS |
| `@deck.gl/layers` | npm | `9.4.0` | production | Permissive/OSS |
| `@deck.gl/react` | npm | `9.4.0` | production | Permissive/OSS |
| `@radix-ui/react-collapsible` | npm | `^1.1.16` | production | Permissive/OSS |
| `@radix-ui/react-dialog` | npm | `^1.1.15` | production | Permissive/OSS |
| `@radix-ui/react-dropdown-menu` | npm | `^2.1.16` | production | Permissive/OSS |
| `@radix-ui/react-scroll-area` | npm | `^1.2.18` | production | Permissive/OSS |
| `@radix-ui/react-select` | npm | `^2.2.6` | production | Permissive/OSS |
| `@radix-ui/react-separator` | npm | `^1.1.8` | production | Permissive/OSS |
| `@radix-ui/react-slot` | npm | `^1.3.3` | production | Permissive/OSS |
| `@radix-ui/react-switch` | npm | `^1.3.7` | production | Permissive/OSS |
| `@radix-ui/react-tabs` | npm | `^1.1.13` | production | Permissive/OSS |
| `@radix-ui/react-toast` | npm | `^1.2.17` | production | Permissive/OSS |
| `@radix-ui/react-tooltip` | npm | `^1.2.16` | production | Permissive/OSS |
| `@tanstack/react-virtual` | npm | `^3.14.5` | production | Permissive/OSS |
| `@xyflow/react` | npm | `^12.12.0` | production | Permissive/OSS |
| `class-variance-authority` | npm | `^0.7.1` | production | Permissive/OSS |
| `clsx` | npm | `^2.1.1` | production | Permissive/OSS |
| `cytoscape` | npm | `3.34.3` | production | Permissive/OSS |
| `exifr` | npm | `^7.1.3` | production | Permissive/OSS |
| `framer-motion` | npm | `^12.38.0` | production | Permissive/OSS |
| `libphonenumber-js` | npm | `^1.13.14` | production | Permissive/OSS |
| `lucide-react` | npm | `^1.8.0` | production | Permissive/OSS |
| `maplibre-gl` | npm | `6.10.0` | production | Permissive/OSS |
| `nanoid` | npm | `^6.0.1` | production | Permissive/OSS |
| `next` | npm | `16.3.6` | production | Permissive/OSS |
| `pg` | npm | `^8.20.0` | production | Permissive/OSS |
| `react` | npm | `^19.3.0` | production | Permissive/OSS |
| `react-dom` | npm | `^19.3.0` | production | Permissive/OSS |
| `react-map-gl` | npm | `8.1.3` | production | Permissive/OSS |
| `react-markdown` | npm | `^10.1.0` | production | Permissive/OSS |
| `redis` | npm | `^6.0.1` | production | Permissive/OSS |
| `remark-gfm` | npm | `^4.0.1` | production | Permissive/OSS |
| `sharp` | npm | `0.35.5` | production | Permissive/OSS |
| `shiki` | npm | `^4.4.3` | production | Permissive/OSS |
| `swr` | npm | `^2.5.1` | production | Permissive/OSS |
| `tailwind-merge` | npm | `^3.5.0` | production | Permissive/OSS |
| `three` | npm | `0.186.0` | production | Permissive/OSS |
| `zod` | npm | `^4.6.5` | production | Permissive/OSS |
| `zustand` | npm | `^5.0.15` | production | Permissive/OSS |
| `@next/bundle-analyzer` | npm | `^16.3.6` | development | Permissive/OSS |
| `@playwright/test` | npm | `^1.64.1` | development | Permissive/OSS |
| `@tailwindcss/postcss` | npm | `^4.3.3` | development | Permissive/OSS |
| `@types/node` | npm | `^26.6.2` | development | Permissive/OSS |
| `@types/pg` | npm | `^8.20.0` | development | Permissive/OSS |
| `@types/react` | npm | `^19.3.0` | development | Permissive/OSS |
| `@types/react-dom` | npm | `^19.3.0` | development | Permissive/OSS |
| `@types/three` | npm | `^0.186.0` | development | Permissive/OSS |
| `autoprefixer` | npm | `^10.4.27` | development | Permissive/OSS |
| `esbuild` | npm | `0.28.1` | development | Permissive/OSS |
| `eslint` | npm | `9.39.5` | development | Permissive/OSS |
| `eslint-config-next` | npm | `16.3.6` | development | Permissive/OSS |
| `postcss` | npm | `8.5.27` | development | Permissive/OSS |
| `tailwindcss` | npm | `^4.3.1` | development | Permissive/OSS |
| `typescript` | npm | `^6.0.3` | development | Permissive/OSS |
| `vitest` | npm | `^4.1.11` | development | Permissive/OSS |
| `py311` | pypi | `unpinned` | production | OSI Approved |
| `UP` | pypi | `unpinned` | production | OSI Approved |
| `E501` | pypi | `unpinned` | production | OSI Approved |
| `C901` | pypi | `unpinned` | production | OSI Approved |
| `UP042` | pypi | `unpinned` | production | OSI Approved |
| `E402` | pypi | `unpinned` | production | OSI Approved |
| `UP007` | pypi | `unpinned` | production | OSI Approved |
| `strict` | pypi | `unpinned` | production | OSI Approved |
