# Indian Vehicle Intelligence & VAHAN/RTO Repository Evaluation Report
**DISHA 6.6 — Digital Intelligence Sovereign Homeland Architecture**  
**Evaluation Date**: 2026-10-14  
**Auditor**: Principal Systems Architect & OSINT Forensic Engineer  

---

## 1. Executive Summary

This evaluation analyzes 9 GitHub repositories and 5 authoritative data provider interfaces for Indian Vehicle Registration (VAHAN/RTO) intelligence. Each candidate was cloned into an isolated staging environment (`staging/vehicle-eval/`), examined at the code and dependency level, and assessed for:
1. Architectural compatibility with DISHA 6.6 (TypeScript/Node.js, Python/FastAPI, PostgreSQL, Redis, Docker).
2. Data authenticity and upstream provider veracity.
3. Legal, regulatory, and ethical compliance (no CAPTCHA solving, no OTP bypass, no unauthenticated scraping of consumer portals, Section 63 BSA compliance).
4. Security posture (hardcoded secrets, dependency vulnerabilities).
5. Maintainability and real-world execution readiness.

---

## 2. Scored Compatibility & Decision Matrix

| Candidate / Repository | Upstream Provider / Mechanism | License | Security & Integrity Rating | Maintenance Status | Decision | Primary Rationale |
|---|---|---|:---:|:---:|:---:|---|
| **1. xd20111/VehicleAPI** | PolicyBoss quote endpoint (`horizon.policyboss.com`) | Unlicensed | ⚠️ CRITICAL RISK (Embedded leaked keys) | Active (2024–2026) | **Adapt Design Only (Reject Upstream)** | Extracts standard and Bharat Series (`BH`) regexes. Hardcodes commercial API secrets (`SECRET-HZ07QRWY...`). Upstream quote scraping violates DISHA security mandates. |
| **2. tridevcyberwarrior/vehicle-lookup-api** | SMC Insurance mobile endpoint (`smcinsurance.com`) | MIT | ⚠️ HIGH RISK (Unapproved broker proxy) | Stale (2025) | **Adapt Design Only (Reject Upstream)** | Reverse-engineers mobile app headers to query third-party broker API without authorization. Choke-point subject to instant blocking; unsuitable for sovereign intelligence. |
| **3. loanzen/parivahan-py** | Scraping `parivahan.gov.in` via automated CAPTCHA breaker | MIT | 🚫 UNACCEPTABLE (Bypasses security controls) | Defunct (Python 2.7, 2017) | **Reject** | Relies on 2Captcha service to break government CAPTCHA; Python 2; targets defunct JSF endpoint. Violates Phase 3 anti-bypass directive. |
| **4. man-navlakha/mechanic-setu-backend** | Multi-provider RapidAPI aggregation with failover & PostgreSQL | MIT | ✅ GOOD (Clean relational schema & failover) | Maintained (2024–2025) | **Adapt Architecture & Schema** | Well-designed PostgreSQL schema (`vehicle_rc_info`), vehicle category inference (`car`, `bike`, `bus`), multi-provider failover loop, consent tracking. Highly compatible with DISHA. |
| **5. SabariVannan/Vehicle-Registration-Verifier** | RapidAPI Vehicle RC Information | MIT | ℹ️ NEUTRAL (Mendix binary package) | Stale (2023) | **Adapt Schema Only** | Mendix `.mpk` low-code package; cannot be directly imported. However, its 37-field data dictionary defines the canonical Indian RC information schema. |
| **6. Aswad-Chandran-A/Vehicle-Master-pro** | Fleet compliance portal (Vahan-Check) with color thresholds | MIT | ✅ EXCELLENT (UX & compliance states) | Maintained (2025) | **Adapt UI & Compliance Model** | Color-coded compliance lifecycle (Green >30d, Amber ≤30d, Red expired) for Insurance, PUC, Fitness, and Tax. Directly informs DISHA Phase 4/6 compliance dashboard. |
| **7. Vonter/india-vehicle-stats** | Parivahan Vahan 4 Dashboard (`vahan.parivahan.gov.in`) | ODbL (Open Database License) | ✅ EXCELLENT (Official open reference data) | Active (2024–2026) | **Integrate Reference Data** | Authentic, open-data repository of all Indian state RTO codes, district registration authorities, and national statistics. Provides offline RTO resolution without egress. |
| **8. cashfree/cashfree-verification-sdk-python** | Cashfree Payments Verification Suite API | Apache-2.0 | ✅ ENTERPRISE GRADE | Maintained (2025–2026) | **Integrate via Provider Engine** | Official Cashfree SDK for vehicle RC verification (`VehicleRcRequestSchema`, `VehicleRcResponseSchema`). Clean OpenAPI contract, sandbox & production support. |
| **9. cashfree/cashfree-verification-sdk-nodejs** | Cashfree Payments Verification Suite TypeScript/Node | Apache-2.0 | ✅ ENTERPRISE GRADE | Maintained (2025–2026) | **Integrate via Provider Engine** | Direct TypeScript contract for RC verification. Matches DISHA Next.js/Node runtime natively with zero transpilation overhead. |

---

## 3. Provider & Documentation Source Evaluation

### A. Parivahan Sewa (`parivahan.gov.in`)
- **Nature**: Official citizen portal of the Ministry of Road Transport and Highways (MoRTH), Government of India.
- **Access Policy**: Direct web portal requires citizen CAPTCHA / OTP / Aadhaar authentication. Unauthenticated automated scraping is prohibited under IT Act and MoRTH terms of service.
- **DISHA Stance**: DISHA does not scrape Parivahan consumer portals. It uses Parivahan public dashboard reference datasets for offline RTO/state verification, and points investigators to official portals for manual verification.

### B. API Setu (`directory.apisetu.gov.in` / `apisetu.gov.in`)
- **Nature**: National e-Governance Division (NeGD) / Ministry of Electronics & IT (MeitY) government API exchange.
- **Provider**: Ministry of Road Transport & Highways — VAHAN Service.
- **Authentication**: OAuth 2.0 with Client ID, Secret, and signed consent artifacts.
- **Fields**: Complete official RC status, maker/model, fuel, registration date, tax, insurance, PUC, and fitness validity.
- **DISHA Stance**: Implemented as `APISetuVehicleProvider`. Active when operator configures `APISETU_CLIENT_ID` and `APISETU_CLIENT_SECRET`.

### C. Cashfree Verification Suite (`cashfree.com/rc-verification`)
- **Nature**: Licensed commercial verification API aggregator with authorized connectivity to national transport databases.
- **Authentication**: `x-client-id`, `x-client-secret`, `x-api-version: 2024-03-01`.
- **Environment**: Supports `sandbox` (test sandbox with simulated numbers) and `production`.
- **Fields**: Comprehensive (37+ fields including insurance company, policy number, expiry, PUC number & expiry, fitness, engine/chassis numbers, owner name).
- **DISHA Stance**: Implemented as `CashfreeVehicleProvider`. Supports configurable environment (`sandbox` vs `production`).

### D. Surepass RC Verification (`surepass.io/vehicle-rc-verification-api`)
- **Nature**: Enterprise identity and verification gateway.
- **Authentication**: Bearer Token (`Authorization: Bearer <token>`).
- **Endpoint**: `https://kyc-api.surepass.io/api/v1/rc/rc-full`.
- **Fields**: Real-time RC status, fitness validity, insurance expiry, PUC status, blacklisting/hypothecation status.
- **DISHA Stance**: Implemented as `SurepassVehicleProvider` with strict timeout and fallback handling.

---

## 4. Key Architectural Decisions for DISHA 6.6

1. **Clean Separation of Reference vs. Live Data**:
   - **Public RTO Reference Provider**: Fast, local, 100% offline resolution of Indian state and RTO codes (e.g., `DL-01` = Mall Road, Delhi North; `MH-12` = Pune, Maharashtra; `KA-05` = Bangalore South; `22BH` = Bharat Series 2022). Always available, 0ms latency, zero external egress.
   - **Live Authorized Providers**: API Setu, Cashfree, Surepass, and generic compliant webhooks. Only triggered when credentials exist.

2. **Regex & Plate Normalization**:
   - Adopt the generalized pattern from `xd20111` and standard MoRTH specifications supporting:
     - Standard plates: `^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$` (e.g., `DL01AB1234`, `MH12DE1432`, `KA05MB9999`)
     - Bharat (BH) series: `^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$` (e.g., `22BH1234AA`)
     - Vintage & diplomatic series: `^[A-Z]{2}[0-9]{2}VA[0-9]{4}$` / diplomatic series `^[0-9]{1,3}CD[0-9]{1,4}$`

3. **Privacy & Data Governance**:
   - In accordance with Section 63 BSA and DISHA defense guidelines, personal data (owner name, father's name, mobile number, full residential address, full engine/chassis numbers) is **masked by default** (e.g., `R**** K****`, `Chassis: ****9812`).
   - Unmasking requires elevated role (`admin` or `lead_investigator`) and emits an immutable forensic audit event.

4. **Forensic Integrity & SHA-256 Custody**:
   - Every lookup records raw response hash, normalized response hash, provider attribution, query timestamp (UTC and IST), and binds into DISHA's `evidence_ledger`.
