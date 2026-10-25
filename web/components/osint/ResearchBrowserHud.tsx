"use client";

import { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  ExternalLink,
  Globe2,
  Maximize2,
  Minimize2,
  RotateCw,
  Search,
  Shield,
  Compass,
  ArrowRight,
  Sparkles,
  Layers,
  Activity,
  Radio,
} from "lucide-react";
import { GodsEyeHologramGlobe, type StrategicNode } from "@/components/visual/GodsEyeHologramGlobe";
import styles from "./research-browser-hud.module.css";

export interface ResearchBrowserHudProps {
  activeTarget?: string;
  activeTargetType?: string;
  globeNodes: StrategicNode[];
  targetCoords: { lat: number; lng: number };
  onSelectNode?: (node: StrategicNode) => void;
  initialUrl?: string;
}

export function ResearchBrowserHud({
  activeTarget = "",
  activeTargetType = "person_name",
  globeNodes,
  targetCoords,
  onSelectNode,
  initialUrl,
}: ResearchBrowserHudProps) {
  const [hudMode, setHudMode] = useState<"browser" | "globe">("browser");
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Compute a smart OSINT research URL based on the active target and its classification
  const defaultTargetUrl = useMemo(() => {
    if (initialUrl && initialUrl.trim()) return initialUrl;
    if (!activeTarget || !activeTarget.trim()) {
      return "https://en.wikipedia.org/wiki/Open-source_intelligence";
    }

    const t = activeTarget.trim();
    const type = (activeTargetType || "").toLowerCase();

    if (type === "ip" || /^(\d{1,3}\.){3}\d{1,3}$/.test(t)) {
      return `https://www.shodan.io/host/${encodeURIComponent(t)}`;
    }
    if (type === "domain" || type === "url" || t.includes(".") && !t.includes(" ")) {
      const cleanHost = t.replace(/^https?:\/\//i, "").split("/")[0];
      return `https://urlscan.io/search/#${encodeURIComponent(cleanHost)}`;
    }
    if (type === "hash" || /^[a-fA-F0-9]{32,64}$/.test(t)) {
      return `https://www.virustotal.com/gui/search/${encodeURIComponent(t)}`;
    }
    if (type === "phone" || t.startsWith("+")) {
      return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`"${t}" phone telecom`)}`;
    }
    if (type === "person_name" || /^[a-zA-Z\s.]{3,40}$/.test(t)) {
      return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(t)}`;
    }

    // Default search across open web
    return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(t)}`;
  }, [activeTarget, activeTargetType, initialUrl]);

  const [urlInput, setUrlInput] = useState(defaultTargetUrl);
  const [activeBrowserUrl, setActiveBrowserUrl] = useState(defaultTargetUrl);

  // Automatically update the browser URL when activeTarget changes
  useEffect(() => {
    if (!defaultTargetUrl) return;
    const timer = window.setTimeout(() => {
      setUrlInput(defaultTargetUrl);
      setActiveBrowserUrl(defaultTargetUrl);
      setIframeKey((k) => k + 1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [defaultTargetUrl]);

  function handleNavigate(e: FormEvent) {
    e.preventDefault();
    let target = urlInput.trim();
    if (!target) return;
    if (!/^https?:\/\//i.test(target)) {
      if (target.includes(".") && !target.includes(" ")) {
        target = `https://${target}`;
      } else {
        target = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(target)}`;
      }
    }
    setUrlInput(target);
    setActiveBrowserUrl(target);
    setIframeKey((k) => k + 1);
  }

  function openExternalBrowser(targetUrl?: string) {
    const destination = targetUrl || activeBrowserUrl;
    if (typeof window !== "undefined") {
      window.open(destination, "_blank", "noopener,noreferrer");
    }
  }

  const quickEngines = [
    { label: "DuckDuckGo", buildUrl: (t: string) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(t || "OSINT")}` },
    { label: "Google", buildUrl: (t: string) => `https://www.google.com/search?q=${encodeURIComponent(t || "OSINT")}` },
    { label: "Wikipedia", buildUrl: (t: string) => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(t || "OSINT")}` },
    { label: "Shodan", buildUrl: (t: string) => `https://www.shodan.io/search?query=${encodeURIComponent(t || "India")}` },
    { label: "VirusTotal", buildUrl: (t: string) => `https://www.virustotal.com/gui/search/${encodeURIComponent(t || "clean")}` },
    { label: "OpenAlex", buildUrl: (t: string) => `https://openalex.org/works?search=${encodeURIComponent(t || "India")}` },
  ];

  return (
    <div className={`${styles.browserHudCard} ${isEnlarged ? styles.browserHudEnlarged : ""}`}>
      {/* Top HUD Command Bar */}
      <div className={styles.hudTopBar}>
        <div className={styles.hudModeSwitch}>
          <button
            type="button"
            className={hudMode === "browser" ? styles.modeBtnActive : styles.modeBtn}
            onClick={() => setHudMode("browser")}
            title="Interactive Research Browser"
          >
            <Globe2 size={13} />
            <span>RESEARCH BROWSER</span>
          </button>
          <button
            type="button"
            className={hudMode === "globe" ? styles.modeBtnActive : styles.modeBtn}
            onClick={() => setHudMode("globe")}
            title="Real 3D Earth Satellite View"
          >
            <Compass size={13} />
            <span>3D EARTH GLOBE</span>
          </button>
        </div>

        {/* Global Action: Open in External Browser */}
        <div className={styles.hudActionGroup}>
          <button
            type="button"
            className={styles.externalBrowserPill}
            onClick={() => openExternalBrowser()}
            title="Open Current Investigation Target in Full External Browser Window"
          >
            <ExternalLink size={13} />
            <strong>OPEN IN EXTERNAL BROWSER</strong>
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setIsEnlarged((prev) => !prev)}
            title={isEnlarged ? "Restore default pane" : "Enlarge research viewport"}
          >
            {isEnlarged ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* URL / Navigation Bar (Visible in browser mode) */}
      {hudMode === "browser" ? (
        <div className={styles.browserToolbar}>
          <form className={styles.browserUrlForm} onSubmit={handleNavigate}>
            <div className={styles.urlInputWrapper}>
              <Search size={13} className={styles.urlSearchIcon} />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter URL or search keyword..."
                className={styles.urlInput}
                spellCheck={false}
              />
            </div>
            <button type="submit" className={styles.urlSubmitBtn} title="Navigate">
              <ArrowRight size={13} />
              <span>GO</span>
            </button>
            <button
              type="button"
              className={styles.iconBtnSmall}
              onClick={() => setIframeKey((k) => k + 1)}
              title="Reload Frame"
            >
              <RotateCw size={12} />
            </button>
          </form>

          {/* Quick OSINT Portals */}
          <div className={styles.quickEnginesStrip}>
            <span className={styles.quickEnginesLabel}>QUICK OSINT:</span>
            {quickEngines.map((eng) => (
              <button
                key={eng.label}
                type="button"
                className={styles.quickEngineBtn}
                onClick={() => {
                  const newUrl = eng.buildUrl(activeTarget);
                  setUrlInput(newUrl);
                  setActiveBrowserUrl(newUrl);
                  setIframeKey((k) => k + 1);
                }}
              >
                {eng.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Viewport: Live Browser vs 3D Earth Globe */}
      <div className={styles.hudViewport}>
        {hudMode === "browser" ? (
          <div className={styles.browserContainer}>
            {/* Embedded Iframe */}
            <iframe
              key={iframeKey}
              src={activeBrowserUrl}
              className={styles.embeddedIframe}
              title="DISHA Sovereign Research Browser"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
              allow="fullscreen; clipboard-read; clipboard-write; geolocation"
            />

            {/* Bottom Security & Direct Access Overlay */}
            <div className={styles.browserSecurityStrip}>
              <div className={styles.browserSecurityInfo}>
                <Shield size={12} className={styles.securityShield} />
                <span>
                  <strong>ISOLATED BROWSER HUD</strong> — Cross-origin sites enforcing X-Frame-Options can be inspected unrestricted via{" "}
                </span>
                <button
                  type="button"
                  className={styles.inlineExternalLink}
                  onClick={() => openExternalBrowser()}
                >
                  <ExternalLink size={11} />
                  <span>[ ↗ External Browser ]</span>
                </button>
              </div>

              {activeTarget ? (
                <div className={styles.targetDossierStrip}>
                  <span className={styles.targetPill}>TARGET: {activeTarget}</span>
                  <button
                    type="button"
                    className={styles.dossierBtn}
                    onClick={() => openExternalBrowser(`https://www.google.com/search?q=${encodeURIComponent(activeTarget)}`)}
                  >
                    Google ↗
                  </button>
                  <button
                    type="button"
                    className={styles.dossierBtn}
                    onClick={() => openExternalBrowser(`https://www.shodan.io/search?query=${encodeURIComponent(activeTarget)}`)}
                  >
                    Shodan ↗
                  </button>
                  <button
                    type="button"
                    className={styles.dossierBtn}
                    onClick={() => openExternalBrowser(`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(activeTarget)}`)}
                  >
                    Wikipedia ↗
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className={styles.globeContainer}>
            <GodsEyeHologramGlobe
              formation="chakra"
              nodes={globeNodes}
              activeTarget={activeTarget}
              activeTargetCoords={targetCoords}
              onSelectNode={onSelectNode}
            />

            {/* Satellite & Telemetry Overlay */}
            <div className={styles.globeTelemetryOverlay}>
              <div className={styles.telemetryPill}>
                <Activity size={11} className={styles.telemetrySpin} />
                <span>COORDINATES: {targetCoords.lat.toFixed(4)}° N, {targetCoords.lng.toFixed(4)}° E</span>
              </div>
              <div className={styles.telemetryPill}>
                <Radio size={11} />
                <span>{globeNodes.length} STRATEGIC NODES ACTIVE</span>
              </div>
              <button
                type="button"
                className={styles.googleEarthBtn}
                onClick={() => openExternalBrowser(`https://earth.google.com/web/@${targetCoords.lat},${targetCoords.lng},1000a,35y,0t,0r`)}
                title="Open these coordinates in the external Google Earth web app (new tab)"
              >
                <Globe2 size={11} />
                <span>VIEW IN GOOGLE EARTH ↗</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
