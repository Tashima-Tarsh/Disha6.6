import { surveillanceTools } from "@/lib/surveillance/tool-registry";

export const metadata = {
  title: "DISHA 6.6 | Surveillance Intelligence",
  description: "Governed OSINT, privacy, tracker-analysis and mobile-forensics workspace.",
};

export default function SurveillanceIntelligencePage() {
  const categories = Array.from(new Set(surveillanceTools.map((tool) => tool.category)));

  return (
    <main style={{ minHeight: "100vh", padding: "32px", background: "#081018", color: "#e7f0f7" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ letterSpacing: 2, textTransform: "uppercase", opacity: 0.7, fontSize: 12 }}>DISHA 6.6</p>
        <h1 style={{ fontSize: 38, margin: "8px 0" }}>Surveillance Intelligence</h1>
        <p style={{ maxWidth: 820, lineHeight: 1.6, opacity: 0.82 }}>
          One governed workspace for public-source spatial intelligence, mobile privacy analysis,
          tracker detection and consent-based device forensics. Each upstream tool remains isolated;
          DISHA receives normalized findings with provenance and policy controls.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 28 }}>
          {surveillanceTools.map((tool) => (
            <section key={tool.id} style={{ border: "1px solid #263746", borderRadius: 14, padding: 18, background: "#0d1721" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 19 }}>{tool.name}</h2>
                <span style={{ fontSize: 11, opacity: 0.75 }}>{tool.status.replaceAll("_", " ")}</span>
              </div>
              <p style={{ opacity: 0.78, lineHeight: 1.5 }}>{tool.purpose}</p>
              <dl style={{ fontSize: 13, lineHeight: 1.6 }}>
                <dt style={{ opacity: 0.55 }}>Upstream</dt>
                <dd style={{ margin: 0 }}>{tool.upstream}</dd>
                <dt style={{ opacity: 0.55, marginTop: 8 }}>Integration</dt>
                <dd style={{ margin: 0 }}>{tool.integrationMode.replaceAll("_", " ")}</dd>
                <dt style={{ opacity: 0.55, marginTop: 8 }}>Boundary</dt>
                <dd style={{ margin: 0 }}>{tool.safetyBoundary}</dd>
              </dl>
            </section>
          ))}
        </div>

        <section style={{ marginTop: 28, padding: 18, border: "1px solid #263746", borderRadius: 14 }}>
          <h2 style={{ marginTop: 0 }}>Integration status</h2>
          <p style={{ opacity: 0.8 }}>
            Catalog is active. Live execution remains disabled until each adapter passes API/CLI,
            license, provenance and policy validation.
          </p>
          <p style={{ opacity: 0.6, fontSize: 13 }}>
            Categories loaded: {categories.join(", ")}
          </p>
        </section>
      </div>
    </main>
  );
}
