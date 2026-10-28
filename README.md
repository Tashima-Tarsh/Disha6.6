<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DISHA 6.6 — Constitutional Evidence Operating System</title>
<style>
  :root{
    --bg:#050810;
    --card:#0e1726;
    --card-2:#121e33;
    --accent:#22d3ee;
    --accent-2:#a855f7;
    --warn:#f59e0b;
    --ok:#34d399;
    --text:#e2e8f0;
    --muted:#94a3b8;
    --glass: rgba(255,255,255,0.04);
    --border: rgba(255,255,255,0.08);
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;background:var(--bg);color:var(--text);font-family:'Segoe UI',Inter,system-ui,sans-serif;overflow-x:hidden}
  body{-webkit-font-smoothing:antialiased}
  a{color:var(--accent);text-decoration:none}
  a:hover{text-decoration:underline}
  .container{max-width:1200px;margin:0 auto;padding:0 24px}

  /* Stage / 3D scene */
  .stage{perspective:1600px;transform-style:preserve-3d}
  .scene{
    position:relative;
    width:100%;
    height:100vh;
    min-height:600px;
    overflow:hidden;
  }
  .cube-face{
    position:absolute;
    top:0;left:0;width:100%;height:100%;
    background:var(--card);
    border:1px solid var(--border);
    border-radius:20px;
    transform-style:preserve-3d;
    backface-visibility:hidden;
    box-shadow:0 25px 60px rgba(0,0,0,0.5);
    padding:40px;
    display:flex;flex-direction:column;gap:24px;
    overflow-y:auto;
  }
  .cube-front{transform:rotateY(0deg) translateZ(600px)}
  .cube-right{transform:rotateY(90deg) translateZ(600px)}
  .cube-back{transform:rotateY(180deg) translateZ(600px)}
  .cube-left{transform:rotateY(-90deg) translateZ(600px)}

  /* hero */
  .hero{padding:80px 0 40px;text-align:center}
  .hero .badge{
    display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border:1px solid var(--accent);
    border-radius:999px;background:rgba(34,211,238,0.08);color:var(--accent);font-size:0.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:16px
  }
  h1{font-size:clamp(2.2rem,5vw,4rem);font-weight:900;line-height:1.05;margin-bottom:16px;letter-spacing:-0.02em}
  h1 span{background:linear-gradient(135deg,var(--accent),var(--accent-2));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .sub{color:var(--muted);font-size:1.15rem;max-width:720px;margin:0 auto 32px;line-height:1.6}
  .hero-strip{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:40px}
  .chip{
    padding:8px 16px;border:1px solid var(--border);border-radius:10px;background:var(--card-2);color:var(--text);font-size:0.85rem
  }
  .chip.ok{border-color:var(--ok);color:var(--ok)}
  .chip.w{color:var(--warn)}

  h2{font-size:1.6rem;margin:56px 0 16px;display:flex;align-items:center;gap:10px}
  h2 .dot{width:10px;height:10px;border-radius:50%;background:var(--accent);box-shadow:0 0 16px var(--accent)}
  p{color:var(--muted);line-height:1.7;max-width:800px;margin-bottom:20px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}
  .card{
    background:var(--card);border:1px solid var(--border);border-radius:18px;padding:24px;transition:transform .3s,border-color .3s;position:relative;overflow:hidden
  }
  .card:hover{border-color:var(--accent);transform:translateY(-4px)}
  .card h3{font-size:1.1rem;margin-bottom:10px;color:#fff}
  .card p{font-size:0.9rem;color:var(--muted);margin:0}
  .tag{display:inline-block;font-size:0.7rem;padding:2px 8px;border-radius:6px;background:rgba(255,255,255,0.06);color:var(--muted);margin-right:6px;margin-bottom:6px}
  .tag.os{color:var(--accent)}
  .tag.cyber{color:var(--warn)}
  .tag.skill{color:var(--accent-2)}

  table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:0.9rem}
  th{text-align:left;padding:10px 8px;color:var(--muted);font-size:0.8rem;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid var(--border)}
  td{padding:12px 8px;border-bottom:1px solid var(--border);color:var(--text)}
  tr:hover td{background:rgba(255,255,255,0.02)}

  .arch{background:var(--card-2);border:1px solid var(--border);border-radius:20px;padding:32px;margin-top:24px}
  .arch svg{width:100%;height:auto;display:block;margin-top:16px}

  .flow{display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin:24px 0}
  .step{padding:10px 16px;border:1px solid var(--accent);border-radius:10px;background:rgba(34,211,238,0.06);color:var(--accent);font-weight:700;font-size:0.85rem}
  .arrow{color:var(--muted)}

  .notice{border-left:3px solid var(--accent);background:rgba(34,211,238,0.05);padding:16px 20px;border-radius:0 10px 10px 0;margin:24px 0;font-size:0.9rem;color:var(--muted)}
  .notice.cyber{border-left-color:var(--warn);background:rgba(245,158,11,0.05);color:var(--muted)}

  footer{padding:60px 0 100px;border-top:1px solid var(--border);color:var(--muted);font-size:0.85rem;text-align:center}

  /* Motion */
  @keyframes spin{from{transform:rotateY(0deg)}to{transform:rotateY(360deg)}}
  .rotating{animation:spin 12s linear infinite}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
  .float{animation:float 6s ease-in-out infinite}

  /* Responsive */
  @media(max-width:768px){.cube-face{padding:24px}}.hero{padding:40px 0 20px}
</style>
</head>
<body>

<div class="container">

  <!-- Hero -->
  <header class="hero">
    <div class="badge">Premium Humaniser Product Catalog</div>
    <h1>DISHA <span>6.6</span></h1>
    <p class="sub">The Constitutional Evidence Operating System — offline, sovereign, source-first intelligence and defense platform. Every conclusion shows its evidence chain.</p>
    <div class="hero-strip">
      <span class="chip ok">Version 6.6</span>
      <span class="chip">Node.js 22</span>
      <span class="chip">Python 3.11</span>
      <span class="chip">Next.js 15</span>
      <span class="chip w">Offline-first</span>
      <span class="chip">No server required</span>
    </div>
  </header>

  <div class="stage">
    <div class="scene rotating">
      <!-- Face 1: Overview & What is DISHA -->
      <div class="cube-face cube-front">
        <h2>What is DISHA 6.6?</h2>
        <p>DISHA 6.6 is a <b>sovereign, evidence-first intelligence and defense operating system</b>. It is built for operators who demand that every conclusion carries its source, every decision is traceable, and no action bypasses human accountability.</p>
        <p>It is not a dashboard. It is not a chatbot wrapper. It is an operating system for governed intelligence work — combining OSINT, authorized security assessment, scientific research, real-time Indian government data probing, defensive threat modeling, multi-agent skill automation, and constitutional policy enforcement into one unified mission runtime.</p>
        <div class="flow">
          <span class="step">Source / Sensor</span><span class="arrow">▸</span><span class="step">Governed Adapter Bus</span><span class="arrow">▸</span><span class="step">Evidence Event</span><span class="arrow">▸</span><span class="step">Policy Gate</span><span class="arrow">▸</span><span class="step">Human Review</span><span class="arrow">▸</span><span class="step">VERIFIED Finding</span>
        </div>
        <div class="notice"><b>Core principle:</b> No observation becomes a claim, and no claim becomes a finding, until it has been sourced, hash-chained into the evidence ledger, policy-gated, and reviewed by a human.</div>
        <h2 style="margin-top:32px">Quick Capabilities</h2>
        <div class="grid">
          <div class="card">
            <span class="tag skill">Skills</span>
            <h3>1,806 indexed skills</h3>
            <p>Across nine families: cybersecurity, OSINT, scientific computing, AI research, networking, frontend, cognitive memory, general.</p>
          </div>
          <div class="card">
            <span class="tag">Roles</span>
            <h3>503 expert roles</h3>
            <p>From cryptographer to forensic analyst — each with instructions, plugin manifest, and governance contract.</p>
          </div>
          <div class="card">
            <span class="tag os">OSIRIS</span>
            <h3>OSIRIS adapters</h3>
            <p>Geospatial & OSINT intelligence: USGS earthquakes, NASA FIRMS fires, maritime, satellites, weather, CCTV, news, GDELT.</p>
          </div>
          <div class="card">
            <span class="tag cyber">VYUHA</span>
            <h3>Defensive formations</h3>
            <p>Adaptive threat classification and formation selection: Chakra, Garuda, Kurma, Padma, Vajra.</p>
          </div>
        </div>
      </div>

      <!-- Face 2: Tools -->
      <div class="cube-face cube-right">
        <h2>Tools & Integration Surface</h2>
        <p>Tooling spans collectors, MCP surfaces, adapters, and workflow bridges. Registration does not imply live execution — each entry must pass contract → policy → evidence → test.</p>
        <table>
          <thead><tr><th>Domain</th><th>Tool / Component</th><th>Location</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td><span class="tag os">OSINT</span></td><td>DNS, cert transparency, archives, IP, GitHub metadata</td><td><code>packages/adapters/</code></td><td><span class="chip ok">Active</span></td></tr>
            <tr><td><span class="tag cyber">Security</span></td><td>Scoped infra checks, API config analysis</td><td><code>packages/adapter-bus/</code>, <code>backend/</code></td><td><span class="chip ok">Active</span></td></tr>
            <tr><td>Research</td><td>Numerical routines, code analysis</td><td><code>.agents/</code>, <code>web/lib/skills/</code></td><td><span class="chip w">Research</span></td></tr>
            <tr><td>Orchestration</td><td>Authenticated n8n integration, durable jobs</td><td><code>web/app/api/v1/workflows/n8n/</code></td><td><span class="chip ok">Active</span></td></tr>
            <tr><td>MCP</td><td>Tools / resources / prompts server (stdio + SSE)</td><td><code>disha/services/mcp/</code></td><td><span class="chip w">Partial</span></td></tr>
            <tr><td>Breach</td><td>Source-qualified exposure analysis</td><td><code>web/lib/unified/breach-dataset-adapter.ts</code></td><td><span class="chip w">Defensive</span></td></tr>
          </tbody>
        </table>
        <div class="notice"><b>36 collector decorators</b> in <code>backend/app.py</code> span breach metadata, account presence, identity validation, infrastructure observations, and network inspection.</div>
        <div class="notice cyber"><b>No raw Aadhaar UID stored</b> — offline Verhoeff check, masked references only. All offline verification is purely local cryptographic.</div>
      </div>

      <!-- Face 3: Skills -->
      <div class="cube-face cube-back">
        <h2>Skills Ecosystem</h2>
        <p>Skills are not loose prompts. Every skill execution is routed through the Constitutional Gateway, logged to the Evidence Ledger, and requires human review before promotion to <b>VERIFIED</b>.</p>
        <div class="grid">
          <div class="card">
            <h3>Skill Registry</h3>
            <p>Catalogs, resolves, and executes skills through the policy gate, with readiness states and execution-status tracking.</p>
          </div>
          <div class="card">
            <h3>n8n Workflow Bridge</h3>
            <p>Authenticated, 8-step governed skill execution with principal propagation and fail-stop behavior.</p>
          </div>
          <div class="card">
            <h3>Cybersecurity skills</h3>
            <p>Heuristic static checks, credential scanning, bracket/syntax validation.</p>
          </div>
          <div class="card">
            <h3>AI research skills</h3>
            <p>Hyperparameter validation, parameter estimation (offline, no training).</p>
          </div>
          <div class="card">
            <h3>Scientific computing</h3>
            <p>Mean, variance, std dev, standard error, t-statistic from supplied numerical data.</p>
          </div>
          <div class="card">
            <h3>Cognitive memory</h3>
            <p>Keyword association graph construction from text corpus.</p>
          </div>
          <div class="card">
            <h3>Software engineering</h3>
            <p>Heuristic security review (eval/Function/child_process/hardcoded secrets), syntax balance.</p>
          </div>
          <div class="card">
            <h3>Computer networking</h3>
            <p>CIDR math, MTU integrity, routing loop detection — input consistency only, no live packets.</p>
          </div>
        </div>
        <div class="flow"><span class="step">Catalogued</span><span class="arrow">▸</span><span class="step">Binding Validated</span><span class="arrow">▸</span><span class="step">Ready</span><span class="arrow">▸</span><span class="step">Smoke Passed</span><span class="arrow">▸</span><span class="step">Production Ready</span></div>
      </div>

      <!-- Face 4: Adapters -->
      <div class="cube-face cube-left">
        <h2>Governed Adapter Bus</h2>
        <p>All external interaction occurs exclusively through the governed Adapter Bus. Adapters emit observations and EvidenceEvents — they never write final findings.</p>
        <table>
          <thead><tr><th>Adapter</th><th>Source</th><th>Category</th><th>Legal Basis</th></tr></thead>
          <tbody>
            <tr><td><span class="tag os">osiris-flights</span></td><td>Flight tracking</td><td>geospatial</td><td>Public</td></tr>
            <tr><td><span class="tag os">osiris-earthquakes</span></td><td>USGS</td><td>geospatial</td><td>Public USGS</td></tr>
            <tr><td><span class="tag os">osiris-fires</span></td><td>NASA FIRMS</td><td>geospatial</td><td>Public NASA</td></tr>
            <tr><td><span class="tag os">osiris-maritime</span></td><td>MarineTraffic</td><td>maritime</td><td>Public</td></tr>
            <tr><td><span class="tag os">osiris-satellites</span></td><td>CelesTrak</td><td>aerospace</td><td>Public TLE</td></tr>
            <tr><td><span class="tag os">osiris-weather</span></td><td>NASA EONET</td><td>geospatial</td><td>Public NASA</td></tr>
            <tr><td><span class="tag os">osiris-cctv</span></td><td>Public cameras</td><td>geospatial</td><td>Public feed</td></tr>
            <tr><td><span class="tag os">osiris-news / gdelt / osint</span></td><td>GDELT / news</td><td>osint</td><td>Public OSINT</td></tr>
          </tbody>
        </table>
        <div class="notice"><b>OSIRIS</b> is the geospatial & OSINT intelligence proxy layer — feeds are allowlisted, no user-supplied URLs are forwarded (no SSRF surface), rate-limited per feed.</div>
        <div class="grid" style="margin-top:16px">
          <div class="card"><span class="tag">DNS / crt.sh</span><h3>DNS & Cert transparency</h3><p>Public domain and certificate observations.</p></div>
          <div class="card"><span class="tag">RDAP / whois</span><h3>Domain registration</h3><p>RDAP domain lookups.</p></div>
          <div class="card"><span class="tag">GitHub</span><h3>Public metadata</h3><p>GitHub public repo/user metadata.</p></div>
          <div class="card"><span class="tag">Wayback</span><h3>Web archives</h3><p>Archived page observations.</p></div>
          <div class="card"><span class="tag cyber">Vyuh Defense</span><h3>Defense adapter</h3><p>Threat classification → formation recommendation.</p></div>
          <div class="card"><span class="tag">Honeypot</span><h3>Deception sensors</h3><p>Approved honeypot event intake & correlation.</p></div>
        </div>
      </div>

      <!-- Face 5: OSINT & BharatData -->
      <div class="cube-face" style="transform:rotateY(180deg) translateZ(600px)">
        <h2>OSINT Intelligence & BharatData</h2>
        <p>Passive OSINT through adapter bus, registry, and search route with source-specific limits. BharatData is the governed India open-data ingestion, verification, and live probe subsystem.</p>
        <table>
          <thead><tr><th>Domain</th><th>Endpoint</th><th>Mechanism</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>CoWIN</td><td>api.cowin.gov.in</td><td>3-host fallback chain</td><td><span class="chip ok">Live</span></td></tr>
            <tr><td>ECI Electoral Search</td><td>electoralsearch.eci.gov.in</td><td>Captcha + JSF POST</td><td><span class="chip ok">Live</span></td></tr>
            <tr><td>VAHAN</td><td>vahan.parivahan.gov.in</td><td>JSF ViewState + captcha</td><td><span class="chip ok">Live</span></td></tr>
            <tr><td>Sarathi DL</td><td>sarathi.parivahan.gov.in</td><td>JSF ViewState + captcha</td><td><span class="chip ok">Live</span></td></tr>
            <tr><td>e-Challan</td><td>echallan.parivahan.gov.in</td><td>POST JSON</td><td><span class="chip ok">Live</span></td></tr>
            <tr><td>Aadhaar Offline</td><td>Signed QR in e-Aadhaar PDF</td><td>Local Verhoeff + pyzbar</td><td><span class="chip ok">Live</span></td></tr>
            <tr><td>GST Taxpayer</td><td>services.gst.gov.in</td><td>Public search + fallback</td><td><span class="chip ok">Live</span></td></tr>
            <tr><td>e-Way Bill</td><td>ewaybillgst.gov.in</td><td>EWB + vehicle lookup</td><td><span class="chip ok">Live</span></td></tr>
            <tr><td>NSSO SSO</td><td>sso.gov.in</td><td>OAuth2 probe + userinfo</td><td><span class="chip ok">Live</span></td></tr>
          </tbody>
        </table>
        <div class="notice cyber"><b>Privacy invariants:</b> Raw Aadhaar UIDs never stored — only masked references. Offline verification is purely local cryptographic (Verhoeff). Live cache TTL 24h with SHA-256 keyed paths.</div>
      </div>

      <!-- Face 6: Cyber Security -->
      <div class="cube-face" style="transform:rotateY(90deg) translateZ(600px)">
        <h2>Cyber Security</h2>
        <p>DISHA defaults to restraint: deny unsafe actions unless explicitly allowed by policy. Model responses are advisory, not fact.</p>
        <div class="grid">
          <div class="card"><span class="tag cyber">No-First-Use</span><h3>Defensive doctrine</h3><p>Defensive proposals only within owned/authorized infrastructure. No unauthorized offensive action.</p></div>
          <div class="card"><span class="tag cyber">Policy Gate</span><h3>Deny-by-default</h3><p>Every high-impact action evaluated before execution; most restrictive decision applied.</p></div>
          <div class="card"><span class="tag cyber">Evidence Ledger</span><h3>Hash-chained</h3><p>Append-only, tamper-evident ledger v2 with SHA-256 chain integrity.</p></div>
          <div class="card"><span class="tag cyber">AuthN / AuthZ</span><h3>Fails closed</h3><p>Every non-health request authenticated; sensitive actions authorized. No optional auth defaulting to open.</p></div>
          <div class="card"><span class="tag cyber">Human Review</span><h3>Final authority</h3><p>Only VERIFIED findings appear in authoritative reports without caveat. Human review gates elevation.</p></div>
          <div class="card"><span class="tag cyber">Secrets</span><h3>Credential discipline</h3><p>bcrypt/argon2/scrypt hashing; secrets in env or managed store; leaked/stolen material prohibited.</p></div>
        </div>
        <div class="flow"><span class="step">Contract</span><span class="arrow">▸</span><span class="step">Policy</span><span class="arrow">▸</span><span class="step">Evidence</span><span class="arrow">▸</span><span class="step">Test</span></div>
      </div>
    </div>
  </div>

  <!-- Architecture Diagram Section -->
  <section class="arch">
    <h2><span class="dot"></span>Architecture — One Mission, Many Capabilities, One Evidence Chain</h2>
    <svg viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="DISHA 6.6 architecture">
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto"><path d="M0,0 L8,3.5 L0,7 Z" fill="#22d3ee"/></marker>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0e1726"/><stop offset="100%" stop-color="#121e33"/></linearGradient>
      </defs>
      <rect x="0" y="0" width="1000" height="600" fill="url(#g1)" rx="20" stroke="rgba(34,211,238,0.15)"/>
      <!-- Workbench -->
      <rect x="40" y="60" width="170" height="70" rx="10" fill="#0b1c34" stroke="#22d3ee" stroke-width="1.5"/>
      <text x="125" y="85" fill="#22d3ee" font-size="13" font-weight="800" text-anchor="middle">Workbench / API v1</text>
      <text x="125" y="108" fill="#94a3b8" font-size="11" text-anchor="middle">Mission submission</text>
      <!-- Orchestrator -->
      <rect x="270" y="40" width="170" height="110" rx="12" fill="#0b1c34" stroke="#a855f7" stroke-width="1.5"/>
      <text x="355" y="70" fill="#a855f7" font-size="13" font-weight="800" text-anchor="middle">Mission Orchestrator</text>
      <text x="355" y="95" fill="#94a3b8" font-size="11" text-anchor="middle">Plan → Scope → Approve → Execute</text>
      <!-- Core Lenses -->
      <rect x="500" y="40" width="180" height="110" rx="12" fill="#0b1c34" stroke="#34d399" stroke-width="1.5"/>
      <text x="590" y="70" fill="#34d399" font-size="13" font-weight="800" text-anchor="middle">Core Lenses</text>
      <text x="590" y="95" fill="#94a3b8" font-size="11" text-anchor="middle">Signal normalize, route, fuse</text>
      <!-- Policy Gate -->
      <rect x="500" y="180" width="180" height="90" rx="12" fill="#0b1c34" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="590" y="205" fill="#f59e0b" font-size="13" font-weight="800" text-anchor="middle">Policy Gate</text>
      <text x="590" y="228" fill="#94a3b8" font-size="11" text-anchor="middle">Deny-by-default decisions</text>
      <!-- Evidence Ledger -->
      <rect x="500" y="300" width="180" height="90" rx="12" fill="#0b1c34" stroke="#22d3ee" stroke-width="1.5"/>
      <text x="590" y="325" fill="#22d3ee" font-size="13" font-weight="800" text-anchor="middle">Evidence Ledger v2</text>
      <text x="590" y="348" fill="#94a3b8" font-size="11" text-anchor="middle">Hash-chained, tamper-evident</text>
      <!-- Result Store -->
      <rect x="740" y="130" width="220" height="80" rx="12" fill="#0b1c34" stroke="#94a3b8" stroke-width="1.5"/>
      <text x="850" y="155" fill="#cbd5e1" font-size="13" font-weight="800" text-anchor="middle">Mission Result Store</text>
      <text x="850" y="178" fill="#94a3b8" font-size="11" text-anchor="middle">Result hash verification</text>
      <!-- Extension Layer -->
      <rect x="270" y="180" width="170" height="210" rx="12" fill="#0b1c34" stroke="#a18cff" stroke-width="1.5"/>
      <text x="355" y="200" fill="#a18cff" font-size="13" font-weight="800" text-anchor="middle">Governed Extension Layer</text>
      <text x="355" y="225" fill="#94a3b8" font-size="10" text-anchor="middle" line-height="1.4">Vyuh Defense • DISHA Brain • Cognitive Loop • Memory/Graph • Honeypot • Physics Sim</text>
      <!-- Human Review -->
      <rect x="740" y="250" width="220" height="100" rx="12" fill="#0b1c34" stroke="#34d399" stroke-width="1.5"/>
      <text x="850" y="275" fill="#34d399" font-size="13" font-weight="800" text-anchor="middle">Human Review → VERIFIED</text>
      <text x="850" y="298" fill="#94a3b8" font-size="11" text-anchor="middle">Final authority on findings</text>
      <!-- Report -->
      <rect x="740" y="380" width="220" height="80" rx="12" fill="#0b1c34" stroke="#94a3b8" stroke-width="1.5"/>
      <text x="850" y="405" fill="#cbd5e1" font-size="13" font-weight="800" text-anchor="middle">Unified Report</text>
      <text x="850" y="428" fill="#94a3b8" font-size="11" text-anchor="middle">Reconstructible findings</text>
      <!-- Arrows -->
      <line x1="210" y1="95" x2="270" y2="95" stroke="#22d3ee" stroke-width="2" marker-end="url(#arr)"/>
      <line x1="355" y1="150" x2="500" y2="95" stroke="#a855f7" stroke-width="2" marker-end="url(#arr)"/>
      <line x1="590" y1="150" x2="590" y2="180" stroke="#34d399" stroke-width="2" marker-end="url(#arr)"/>
      <line x1="590" y1="270" x2="590" y2="300" stroke="#f59e0b" stroke-width="2" marker-end="url(#arr)"/>
      <line x1="590" y1="390" x2="740" y2="170" stroke="#22d3ee" stroke-width="2" marker-end="url(#arr)"/>
      <line x1="590" y1="390" x2="850" y2="320" stroke="#22d3ee" stroke-width="2" marker-end="url(#arr)"/>
      <line x1="590" y1="390" x2="850" y2="420" stroke="#34d399" stroke-width="2" marker-end="url(#arr)"/>
      <line x1="355" y1="285" x2="500" y2="345" stroke="#a18cff" stroke-width="2" marker-end="url(#arr)"/>
      <line x1="440" y1="345" x2="500" y2="345" stroke="#a18cff" stroke-width="2" marker-end="url(#arr)"/>
      <text x="850" y="460" fill="#64748b" font-size="11" text-anchor="middle">Extension outputs re-evaluated by Policy Gate</text>
    </svg>
    <p class="notice">Blue = implemented foundation · Purple = partial integration · Green = defensive proposals / planned execution. Nothing becomes product behavior until it passes contract → policy → evidence → test.</p>
  </section>

  <footer>
    DISHA 6.6 — Constitutional Evidence Operating System · One evidence chain. One mission. Accountable to the citizen.<br>
    <a href="ARCHITECTURE.md">Architecture</a> · <a href="CONSTITUTION.md">Constitution</a> · <a href="README.md">Runbook</a> · <a href="SECURITY.md">Security</a>
  </footer>

</div>

<script>
  // Gentle interactive tilt on the 3D cube scene (mouse-driven, no external deps)
  const scene = document.querySelector('.scene');
  if(scene){
    let rx = 0, ry = 0;
    document.addEventListener('mousemove',(e)=>{
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      rx += (y - rx) * 0.05;
      ry += (x - ry) * 0.05;
      scene.style.transform = `rotateX(${-rx}deg) rotateY(${ry}deg)`;
    });
  }
</script>

</body>
</html>

