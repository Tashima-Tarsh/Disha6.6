import type { TimeRange } from "../../lib/investigation/types";

export interface TimeFilterResult {
  inRange: boolean;
  timestampUnknown: boolean;
  observedDate?: Date;
}

export function evaluateTimeRange(
  timestampStr: string | undefined | null,
  timeRange: TimeRange,
  nowMs = Date.now(),
): TimeFilterResult {
  if (!timestampStr) {
    return { inRange: true, timestampUnknown: true };
  }

  const parsed = Date.parse(timestampStr);
  if (Number.isNaN(parsed)) {
    return { inRange: true, timestampUnknown: true };
  }

  const date = new Date(parsed);
  const diffMs = nowMs - parsed;

  if (diffMs < -60_000) {
    return { inRange: true, timestampUnknown: true, observedDate: date };
  }

  let maxAgeMs: number;
  switch (timeRange) {
    case "24h":
      maxAgeMs = 24 * 60 * 60 * 1000;
      break;
    case "7d":
      maxAgeMs = 7 * 24 * 60 * 60 * 1000;
      break;
    case "30d":
      maxAgeMs = 30 * 24 * 60 * 60 * 1000;
      break;
    case "custom":
    default:
      return { inRange: true, timestampUnknown: false, observedDate: date };
  }

  return {
    inRange: diffMs <= maxAgeMs,
    timestampUnknown: false,
    observedDate: date,
  };
}
