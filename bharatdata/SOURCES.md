# Data Sources & Upstream Catalogs

This document catalogues all public datasets, open APIs, and upstream feeds integrated into BharatData.

---

## 1. Election Commission of India (ECI) & Harvard Dataverse
- **Source Description**: Indian election data repository comprising Lok Sabha and State Legislative Assembly election results, candidate lists, voter turnout, and party affiliations.
- **Upstream URLs**:
  - ECI Official Results: `https://results.eci.gov.in/`
  - Harvard Dataverse Lok Sabha / Vidhan Sabha repository: `https://dataverse.harvard.edu/api/datasets/`
- **Cadence**: On-demand / post-election cycles.
- **Format**: CSV, TSV, JSON.
- **License / Policy**: Open Government Data License India / Academic Public Domain.

---

## 2. CoWIN (Ministry of Health and Family Welfare)
- **Source Description**: National vaccination rollout statistics, session summaries, district-wise and state-wise vaccine delivery breakdown.
- **Upstream URLs**:
  - CoWIN Public API: `https://cdn-api.co-vin.in/api/v2/`
  - Daily Aggregates: `/v2/admin/reports/v1/dailyReport`
- **Cadence**: Daily automated pull.
- **Format**: JSON.
- **Rate Limit**: Maximum 100 requests per 5 minutes per IP.

---

## 3. Vahan & Sarathi (Ministry of Road Transport & Highways - MoRTH)
- **Source Description**: Vehicle registration aggregates, fuel classification, maker statistics, and state/RTO vehicle population metrics.
- **Upstream URLs**:
  - Vahan Open Analytics Dashboard: `https://vahan.parivahan.gov.in/vahan4dashboard/`
  - Sarathi License Service Portal: `https://sarathi.parivahan.gov.in/`
- **Cadence**: Weekly / Monthly aggregates.
- **Format**: JSON / Excel / HTML tabular data.

---

## 4. eChallan (Parivahan)
- **Source Description**: Public traffic violation notice status and disposal state.
- **Upstream URL**: `https://echallan.parivahan.gov.in/`
- **Access Protocol**: Live verification adapter (session-authenticated or public captcha-gated status probe).

---

## 5. Aadhaar Offline Verification (UIDAI)
- **Source Description**: Offline paperless e-KYC XML schema and Secure QR Code specification published by Unique Identification Authority of India (UIDAI).
- **Specification**: UIDAI Offline Paperless e-KYC specification v1.2 / Secure QR Code Specification.
- **Privacy Standard**: 
  - Strictly no storage of full 12-digit UID.
  - Verification operates only on SHA-256 digests, digital certificates, and masked Aadhaar reference strings.
- **Format**: Signed XML / compressed byte stream.

---

## 6. ICMR (Indian Council of Medical Research)
- **Source Description**: Public health laboratory networks, accredited testing infrastructure, and health surveillance reports.
- **Upstream URLs**:
  - ICMR Portal: `https://www.icmr.gov.in/`
- **Cadence**: Periodic sync.
- **Format**: PDF reports, structured CSV datasets.

