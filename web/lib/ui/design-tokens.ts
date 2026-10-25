/**
 * DISHA 6.6 Design System Tokens & Accessibility Engine
 * Inspired by UI UX Pro Max & Vercel Agent Skills
 */

export const DESIGN_TOKENS = {
  colors: {
    background: {
      primary: "#060911",
      secondary: "#0b1120",
      panel: "rgba(15, 23, 42, 0.88)",
      panelSolid: "#0d1527",
      card: "rgba(17, 24, 39, 0.85)",
      input: "rgba(3, 7, 18, 0.85)",
    },
    text: {
      primary: "#f8fafc",
      secondary: "#94a3b8",
      muted: "#64748b",
      inverse: "#030712",
    },
    brand: {
      cyan: "#00f0ff",
      blue: "#0284c7",
      violet: "#a855f7",
      saffron: "#f59e0b",
      emerald: "#10b981",
    },
    status: {
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#38bdf8",
      unknown: "#6b7280",
    },
  },
  typography: {
    fontSans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  },
  radii: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    full: "9999px",
  },
} as const;

/**
 * Calculates relative luminance for WCAG contrast ratio checks
 */
function getLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const rgb = [0, 2, 4].map((idx) => parseInt(cleanHex.substring(idx, idx + 2), 16) / 255);
  const a = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/**
 * Returns WCAG contrast ratio between two hex colors (e.g. 4.5:1 for AA normal text, 7:1 for AAA)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

/**
 * Audits a given color combination against WCAG 2.1 AA standards
 */
export function auditColorAccessibility(fgHex: string, bgHex: string, isLargeText = false): {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
} {
  const ratio = getContrastRatio(fgHex, bgHex);
  const minAA = isLargeText ? 3.0 : 4.5;
  const minAAA = isLargeText ? 4.5 : 7.0;
  return {
    ratio,
    passesAA: ratio >= minAA,
    passesAAA: ratio >= minAAA,
  };
}

