"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Car,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Download,
  Copy,
  Check,
  RefreshCw,
  Search,
  ExternalLink,
  Lock,
  Unlock,
  Fuel,
  Calendar,
  Building,
  Hash,
  Activity,
} from "lucide-react";
import type { VehicleVerificationResult, VehicleProviderHealth } from "@/lib/vehicle/types";
import { parseIndianRegistration } from "@/lib/vehicle/validator";
import styles from "./vehicle-console.module.css";

interface VehicleIntelligenceConsoleProps {
  initialRegistration?: string;
  caseId?: string;
  onSelectEvidence?: (record: VehicleVerificationResult) => void;
}

export function VehicleIntelligenceConsole({
  initialRegistration = "",
  caseId = "",
  onSelectEvidence,
}: VehicleIntelligenceConsoleProps) {
  const [registration, setRegistration] = useState(initialRegistration);
  const [caseNumber, setCaseNumber] = useState(caseId);
  const [purpose, setPurpose] = useState("Official vehicle registration verification");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [allowCached, setAllowCached] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VehicleVerificationResult | null>(null);
  const [providersHealth, setProvidersHealth] = useState<VehicleProviderHealth[]>([]);
  const [copiedHash, setCopiedHash] = useState(false);
  const [unmasked, setUnmasked] = useState(true);

  // Live plate parsing preview
  const parsedPlate = parseIndianRegistration(registration);

  // Fetch provider health on mount
  useEffect(() => {
    async function loadHealth() {
      try {
        const res = await fetch("/api/vehicles/providers/health");
        if (res.ok) {
          const data = await res.json();
          setProvidersHealth(data.providers || []);
        }
      } catch {
        // Non-blocking
      }
    }
    loadHealth();
  }, []);

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!registration.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/vehicles/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_number: registration.trim(),
          case_id: caseNumber.trim() || undefined,
          purpose: purpose.trim() || undefined,
          allow_cached: allowCached && !forceRefresh,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const data: VehicleVerificationResult = await res.json();
      setResult(data);
      if (onSelectEvidence) {
        onSelectEvidence(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function copyEvidenceHash() {
    if (!result?.evidence?.normalizedHashSha256) return;
    navigator.clipboard.writeText(result.evidence.normalizedHashSha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  }

  function downloadJsonDossier() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DISHA-Vehicle-${result.registration_number}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openPrintableReport() {
    if (!result) return;
    window.open(`/api/vehicles/report?registration_number=${encodeURIComponent(result.registration_number)}&format=html`, "_blank");
  }

  return (
    <div className={styles.consoleContainer}>
      {/* Search & Provider Header */}
      <div className={styles.searchCard}>
        <div className={styles.headerRow}>
          <div className={styles.titleArea}>
            <h2>
              <Car size={20} color="#38bdf8" />
              Indian Vehicle Registration Intelligence // VAHAN &amp; RTO
            </h2>
            <p>
              Authoritative multi-source vehicle intelligence, statutory compliance verification &amp; digital forensics
            </p>
          </div>

          <div className={styles.providerPills}>
            {providersHealth.map((p) => (
              <div
                key={p.id}
                className={`${styles.providerPill} ${
                  p.status === "healthy" ? styles.providerPillHealthy : p.status === "degraded" ? styles.providerPillDegraded : ""
                }`}
                title={p.detail}
              >
                <Activity size={10} />
                <span>{p.name.split(" ")[0]}</span>
                <strong>{p.status === "healthy" ? "ONLINE" : p.status.toUpperCase()}</strong>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.inputGroup}>
            <div className={styles.plateInputWrapper}>
              <Car size={20} className={styles.plateIcon} />
              <input
                type="text"
                className={styles.plateInput}
                placeholder="e.g. DL01AB1234, 22BH1234AA, MH12DE1433"
                value={registration}
                onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                autoFocus
              />
              <span
                className={`${styles.formatBadge} ${
                  parsedPlate.isValid ? styles.formatBadgeActive : ""
                }`}
              >
                {parsedPlate.isValid
                  ? parsedPlate.format === "bharat_series"
                    ? `BHARAT SERIES (BH ${parsedPlate.bhYear ?? ""})`
                    : `${parsedPlate.stateCode || "IN"} · ${parsedPlate.format.replace("_", " ")}`
                  : registration.trim().length > 2
                  ? "INVALID FORMAT"
                  : "ENTER PLATE"}
              </span>
            </div>

            <button
              type="submit"
              className={styles.searchButton}
              disabled={loading || !registration.trim()}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className={styles.spin} />
                  <span>VERIFYING...</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>RUN LOOKUP</span>
                </>
              )}
            </button>
          </div>

          <div className={styles.optionsRow}>
            <div>
              <label style={{ marginRight: 6 }}>Case ID:</label>
              <input
                type="text"
                className={styles.optInput}
                placeholder="CASE-XXXX"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
              />
            </div>
            <div>
              <label style={{ marginRight: 6 }}>Purpose:</label>
              <input
                type="text"
                className={styles.optInput}
                placeholder="Investigation Purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                style={{ minWidth: 260 }}
              />
            </div>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={forceRefresh}
                onChange={(e) => setForceRefresh(e.target.checked)}
              />
              <span>Force Live Refresh</span>
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={allowCached}
                disabled={forceRefresh}
                onChange={(e) => setAllowCached(e.target.checked)}
              />
              <span>Allow Local Case Vault Records</span>
            </label>
          </div>
        </form>

        {error && (
          <div style={{ marginTop: 16, color: "#f87171", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Dossier Display */}
      {result && (
        <div className={styles.dossierCard}>
          {/* Header Bar */}
          <div className={styles.dossierHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {/* High Security Registration Plate (HSRP) Graphic */}
              <div className={styles.hsrpPlate}>
                <div className={styles.hsrpBlueStrip}>
                  <span className={styles.hsrpChakra}>☸</span>
                  <span>IND</span>
                </div>
                <div className={styles.hsrpNumber}>
                  {result.registration_number.replace(/([A-Z0-9]{2})([0-9]{2})([A-Z]{0,3})([0-9]{4})/, "$1 $2 $3 $4")}
                </div>
              </div>

              <div className={styles.headerBadges}>
                <span
                  className={`${styles.statusBadge} ${
                    result.status === "VERIFIED"
                      ? styles.statusVerified
                      : result.status === "NOT_FOUND"
                      ? styles.statusNotFound
                      : result.status === "PUBLIC_REFERENCE"
                      ? styles.statusPublicRef
                      : styles.statusRestricted
                  }`}
                >
                  {result.status === "VERIFIED" ? (
                    <ShieldCheck size={14} />
                  ) : (
                    <ShieldAlert size={14} />
                  )}
                  {result.status}
                </span>

                <span className={styles.sourceBadge}>
                  SOURCE: {result.source} ({result.data_type.toUpperCase()})
                </span>
              </div>
            </div>

            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={openPrintableReport}
                title="View printable legal forensic report"
              >
                <FileText size={14} />
                <span>Forensic Report</span>
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={downloadJsonDossier}
                title="Download JSON dossier"
              >
                <Download size={14} />
                <span>JSON</span>
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={copyEvidenceHash}
                title="Copy SHA-256 normalized hash"
              >
                {copiedHash ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                <span>{copiedHash ? "Copied" : "SHA-256"}</span>
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => setUnmasked(!unmasked)}
                style={{
                  background: unmasked ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.1)",
                  borderColor: unmasked ? "#10b981" : "#ef4444",
                  color: unmasked ? "#047857" : "#b91c1c",
                  fontWeight: 700,
                }}
                title={unmasked ? "Switch to Masked View" : "Unmask Full Verification Details"}
              >
                {unmasked ? <Unlock size={14} color="#047857" /> : <Lock size={14} color="#b91c1c" />}
                <span>{unmasked ? "UNMASKED" : "MASKED"}</span>
              </button>
            </div>
          </div>

          {/* Statutory Compliance Grid */}
          <div className={styles.complianceSection}>
            <div className={styles.sectionHeading}>
              <ShieldCheck size={16} />
              Statutory Road Compliance &amp; Validity Thresholds
            </div>

            <div className={styles.complianceGrid}>
              {/* Insurance */}
              <div
                className={`${styles.complianceCard} ${
                  result.compliance.insuranceStatus === "VALID"
                    ? styles.complianceCardValid
                    : result.compliance.insuranceStatus === "EXPIRING_SOON"
                    ? styles.complianceCardExpiring
                    : result.compliance.insuranceStatus === "EXPIRED"
                    ? styles.complianceCardExpired
                    : styles.complianceCardUnavailable
                }`}
              >
                <div className={styles.complianceLabelRow}>
                  <span className={styles.complianceTitle}>Insurance Policy</span>
                  <span
                    className={`${styles.compliancePill} ${
                      result.compliance.insuranceStatus === "VALID"
                        ? styles.pillValid
                        : result.compliance.insuranceStatus === "EXPIRING_SOON"
                        ? styles.pillExpiring
                        : result.compliance.insuranceStatus === "EXPIRED"
                        ? styles.pillExpired
                        : styles.pillUnavailable
                    }`}
                  >
                    {result.compliance.insuranceStatus}
                  </span>
                </div>
                <div className={styles.complianceValue}>
                  {result.compliance.insuranceCompany || "Not Recorded"}
                </div>
                <div className={styles.complianceSubtext}>
                  {result.compliance.insuranceValidUntil
                    ? `Expires: ${result.compliance.insuranceValidUntil} (${result.compliance.daysUntilInsuranceExpiry ?? "?"} days)`
                    : "Policy validity details restricted / unavailable"}
                </div>
              </div>

              {/* PUC */}
              <div
                className={`${styles.complianceCard} ${
                  result.compliance.pucStatus === "VALID"
                    ? styles.complianceCardValid
                    : result.compliance.pucStatus === "EXPIRING_SOON"
                    ? styles.complianceCardExpiring
                    : result.compliance.pucStatus === "EXPIRED"
                    ? styles.complianceCardExpired
                    : styles.complianceCardUnavailable
                }`}
              >
                <div className={styles.complianceLabelRow}>
                  <span className={styles.complianceTitle}>PUC Certificate</span>
                  <span
                    className={`${styles.compliancePill} ${
                      result.compliance.pucStatus === "VALID"
                        ? styles.pillValid
                        : result.compliance.pucStatus === "EXPIRING_SOON"
                        ? styles.pillExpiring
                        : result.compliance.pucStatus === "EXPIRED"
                        ? styles.pillExpired
                        : styles.pillUnavailable
                    }`}
                  >
                    {result.compliance.pucStatus}
                  </span>
                </div>
                <div className={styles.complianceValue}>
                  {result.compliance.pucNumber ? `PUCC: ${result.compliance.pucNumber}` : "Pollution Under Control"}
                </div>
                <div className={styles.complianceSubtext}>
                  {result.compliance.pucValidUntil
                    ? `Valid Upto: ${result.compliance.pucValidUntil}`
                    : "Emission certificate validity unavailable"}
                </div>
              </div>

              {/* Fitness */}
              <div
                className={`${styles.complianceCard} ${
                  result.compliance.fitnessStatus === "VALID"
                    ? styles.complianceCardValid
                    : result.compliance.fitnessStatus === "EXPIRING_SOON"
                    ? styles.complianceCardExpiring
                    : result.compliance.fitnessStatus === "EXPIRED"
                    ? styles.complianceCardExpired
                    : styles.complianceCardUnavailable
                }`}
              >
                <div className={styles.complianceLabelRow}>
                  <span className={styles.complianceTitle}>Fitness Validity</span>
                  <span
                    className={`${styles.compliancePill} ${
                      result.compliance.fitnessStatus === "VALID"
                        ? styles.pillValid
                        : result.compliance.fitnessStatus === "EXPIRING_SOON"
                        ? styles.pillExpiring
                        : result.compliance.fitnessStatus === "EXPIRED"
                        ? styles.pillExpired
                        : styles.pillUnavailable
                    }`}
                  >
                    {result.compliance.fitnessStatus}
                  </span>
                </div>
                <div className={styles.complianceValue}>
                  {result.compliance.fitnessValidUntil || "Standard Motor Fitness"}
                </div>
                <div className={styles.complianceSubtext}>
                  {result.compliance.fitnessValidUntil
                    ? `Valid Upto: ${result.compliance.fitnessValidUntil} (${result.compliance.daysUntilFitnessExpiry ?? "?"} days)`
                    : "Mandatory for commercial & transport vehicles"}
                </div>
              </div>

              {/* Road Tax */}
              <div
                className={`${styles.complianceCard} ${
                  result.compliance.taxStatus === "VALID"
                    ? styles.complianceCardValid
                    : styles.complianceCardUnavailable
                }`}
              >
                <div className={styles.complianceLabelRow}>
                  <span className={styles.complianceTitle}>Road Motor Tax</span>
                  <span
                    className={`${styles.compliancePill} ${
                      result.compliance.isLifetimeTax || result.compliance.taxStatus === "VALID"
                        ? styles.pillValid
                        : styles.pillUnavailable
                    }`}
                  >
                    {result.compliance.isLifetimeTax ? "LIFETIME (LTT)" : result.compliance.taxStatus}
                  </span>
                </div>
                <div className={styles.complianceValue}>
                  {result.compliance.isLifetimeTax ? "One-Time Lifetime Tax Paid" : result.compliance.taxValidUntil || "Tax Status Normal"}
                </div>
                <div className={styles.complianceSubtext}>
                  {result.compliance.taxValidUntil ? `Valid Upto: ${result.compliance.taxValidUntil}` : "State Motor Vehicles Tax"}
                </div>
              </div>
            </div>
          </div>

          {/* Details & Specs Grid */}
          <div className={styles.detailsGrid}>
            {/* Technical Specifications */}
            <div className={styles.infoCard}>
              <div className={styles.sectionHeading}>
                <Car size={16} />
                Technical Specifications &amp; Build
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Make &amp; Manufacturer:</span>
                <span className={styles.infoValue}>{result.vehicle.manufacturer || "N/A"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Model &amp; Variant:</span>
                <span className={styles.infoValue}>{result.vehicle.model ? `${result.vehicle.model} ${result.vehicle.modelVariant || ""}`.trim() : "N/A"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Category &amp; Class:</span>
                <span className={styles.infoValue}>{result.vehicle.vehicleClass || result.vehicle.vehicleCategory.toUpperCase()}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Fuel Type:</span>
                <span className={styles.infoValue}>{result.vehicle.fuelType || "N/A"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Color:</span>
                <span className={styles.infoValue}>{result.vehicle.color || "N/A"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Engine Capacity:</span>
                <span className={styles.infoValue}>{result.vehicle.engineCapacityCc ? `${result.vehicle.engineCapacityCc} cc` : "N/A"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Emission Standard:</span>
                <span className={styles.infoValue}>{result.vehicle.emissionNorms || "N/A"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Manufacturing Date:</span>
                <span className={styles.infoValue}>{result.vehicle.manufacturingMonthYear || "N/A"}</span>
              </div>
            </div>

            {/* Registration & RTO Jurisdiction */}
            <div className={styles.infoCard}>
              <div className={styles.sectionHeading}>
                <Building size={16} />
                RTO Authority &amp; Registration
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>State / UT Jurisdiction:</span>
                <span className={styles.infoValue}>{result.plate.stateName || "All India"} ({result.plate.stateCode || "IN"})</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Registered RTO Office:</span>
                <span className={styles.infoValue}>{result.plate.rtoName || result.plate.rtoCode || "Central / BH"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>RTO Code:</span>
                <span className={`${styles.infoValue} ${styles.monoValue}`}>{result.plate.rtoCode || "N/A"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Plate Format:</span>
                <span className={styles.infoValue}>{result.plate.format.toUpperCase()}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Registration Date:</span>
                <span className={styles.infoValue}>{result.vehicle.registrationDate || "N/A"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>RC Status:</span>
                <span className={styles.infoValue}>{result.vehicle.rcStatus || "ACTIVE"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Hypothecation / Financed:</span>
                <span className={styles.infoValue}>{result.vehicle.rcFinancer || (result.vehicle.isFinanced ? "Yes (Financed)" : "No Hypothecation")}</span>
              </div>
            </div>

            {/* Ownership & Identity Safeguards */}
            <div className={styles.infoCard}>
              <div className={styles.sectionHeading} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {unmasked ? <Unlock size={16} color="#059669" /> : <Lock size={16} color="#3b82f6" />}
                  Identity &amp; Ownership Verification
                </span>
                <button
                  type="button"
                  onClick={() => setUnmasked(!unmasked)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: unmasked ? "1px solid #10b981" : "1px solid #94a3b8",
                    background: unmasked ? "rgba(16, 185, 129, 0.12)" : "rgba(148, 163, 184, 0.1)",
                    color: unmasked ? "#047857" : "#475569",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  title="Toggle unmasked real records vs masked DPDP view"
                >
                  {unmasked ? <Unlock size={12} /> : <Lock size={12} />}
                  {unmasked ? "UNMASKED" : "MASKED"}
                </button>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Registered Owner:</span>
                <span
                  className={styles.infoValue}
                  style={{
                    fontWeight: unmasked ? 700 : 500,
                    color: unmasked ? "#047857" : undefined,
                  }}
                >
                  {unmasked
                    ? (result.owner_info.unmaskedOwnerName || result.owner_info.ownerName?.replace(/^\[PROTECTED\]\s*/, "") || "N/A")
                    : (result.owner_info.ownerName || "[PROTECTED]")}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Father&apos;s Name:</span>
                <span className={styles.infoValue}>
                  {unmasked
                    ? (result.owner_info.unmaskedFatherName || result.owner_info.fatherName?.replace(/^\[PROTECTED\]\s*/, "") || "N/A")
                    : (result.owner_info.fatherName || "[PROTECTED]")}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Mobile / Contact:</span>
                <span className={`${styles.infoValue} ${styles.monoValue}`}>
                  {unmasked
                    ? (result.owner_info.unmaskedMobileNumber || result.owner_info.mobileNumber?.replace(/^\[PROTECTED\]\s*/, "") || "N/A")
                    : (result.owner_info.mobileNumber || "[PROTECTED]")}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Chassis Number:</span>
                <span
                  className={`${styles.infoValue} ${styles.monoValue}`}
                  style={{
                    color: unmasked ? "#1d4ed8" : undefined,
                    fontWeight: unmasked ? 700 : 400,
                  }}
                >
                  {unmasked
                    ? (result.owner_info.unmaskedChassisNumber || result.owner_info.chassisNumber?.replace(/^\[MASKED\]\s*/, "") || "N/A")
                    : (result.owner_info.chassisNumber || "[MASKED]")}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Engine Number:</span>
                <span
                  className={`${styles.infoValue} ${styles.monoValue}`}
                  style={{
                    color: unmasked ? "#1d4ed8" : undefined,
                    fontWeight: unmasked ? 700 : 400,
                  }}
                >
                  {unmasked
                    ? (result.owner_info.unmaskedEngineNumber || result.owner_info.engineNumber?.replace(/^\[MASKED\]\s*/, "") || "N/A")
                    : (result.owner_info.engineNumber || "[MASKED]")}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Registered Address:</span>
                <span className={styles.infoValue} style={{ fontSize: 12 }}>
                  {unmasked
                    ? (result.owner_info.unmaskedPermanentAddress || result.owner_info.permanentAddress || "N/A")
                    : (result.owner_info.permanentAddress ? "[MASKED LOCALITY] " + result.owner_info.permanentAddress.split(",").slice(-2).join(",") : "[PROTECTED]")}
                </span>
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: unmasked ? "#059669" : "#64748b",
                  margin: "12px 0 0 0",
                  lineHeight: 1.5,
                  fontWeight: unmasked ? 600 : 400,
                }}
              >
                {unmasked
                  ? "🔓 Full statutory records unmasked for lawful investigator cross-verification. Immutable audit receipt logged."
                  : "🔒 Masked mode active pursuant to statutory privacy policies. Click toggle above to view unmasked details."}
              </p>
            </div>
          </div>

          {/* Cryptographic Evidence & Provenance Section */}
          <div className={styles.evidenceSection}>
            <div className={styles.sectionHeading}>
              <Hash size={16} />
              Cryptographic Provenance &amp; Evidence Custody (Section 63 BSA)
            </div>

            <div className={styles.hashGrid}>
              <div className={styles.hashBox}>
                <div className={styles.hashTitle}>Normalized Record SHA-256 Hash</div>
                <div className={styles.hashString}>{result.evidence.normalizedHashSha256}</div>
              </div>
              <div className={styles.hashBox}>
                <div className={styles.hashTitle}>Raw Upstream Payload SHA-256 Hash</div>
                <div className={styles.hashString}>{result.evidence.rawResponseHashSha256}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12, color: "#94a3b8" }}>
              <span>Observed (UTC): <strong>{result.evidence.retrievedAtUtc}</strong></span>
              <span>Observed (IST): <strong>{result.evidence.retrievedAtIst}</strong></span>
              <span>Case ID: <strong>{result.evidence.caseId || "Ad-hoc"}</strong></span>
              <span>Integrity: <strong>{result.evidence.integrityStatus}</strong></span>
            </div>

            <div className={styles.legalNotice}>
              <strong>DISHA Governed Intelligence Notice:</strong> This record was generated in accordance with statutory compliance guidelines.
              If the status is <strong>PUBLIC_REFERENCE</strong>, technical specifications are retrieved from offline official RTO directories without querying live protected VAHAN endpoints.
              All queries are recorded to the tamper-evident audit ledger.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
