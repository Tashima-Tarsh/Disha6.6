import type { Investigation } from "./types";
export type Requester = <T>(url: string, init?: RequestInit) => Promise<T>;
export function csrfHeaders(): Record<string, string> {
  const entry = document.cookie.split("; ").find(value => value.startsWith("disha_csrf="));
  return entry ? { "x-csrf-token": decodeURIComponent(entry.slice("disha_csrf=".length)) } : {};
}
export const investigationRequest: Requester = async <T>(url: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(url, { ...init, credentials: "same-origin", cache: "no-store", headers: { ...csrfHeaders(), ...init.headers } });
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "INVESTIGATION SERVICE FAILED");
  return body as T;
};
const root = "/api/v1/osint/investigations";
export class InvestigationSession {
  private controller: AbortController | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private expiry: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private disposed = false;
  active: Investigation | null = null;
  constructor(private update: (value: Investigation | null) => void, private error: (message: string) => void, private request: Requester = investigationRequest) {}
  async start(input: { target: string; targetType: string; identityAuthorization?: boolean } | File) {
    if (this.active) throw new Error("Close the current investigation before starting another.");
    const generation = ++this.generation;
    const image = input instanceof File;
    const form = image ? new FormData() : undefined;
    if (form) form.set("image", input as File);
    const value = await this.request<Investigation>(image ? `${root}/image` : root, { method: "POST", headers: image ? undefined : { "content-type": "application/json" }, body: form ?? JSON.stringify(input) });
    if (this.disposed || generation !== this.generation) {
      await this.request(`${root}/${value.investigationId}`, { method: "DELETE", keepalive: true });
      return;
    }
    this.active = value;
    this.update(value);
    this.expiry = setTimeout(() => void this.close().catch(error => this.error(error instanceof Error ? error.message : "SESSION EXPIRATION CLEANUP FAILED")), Math.max(1, Date.parse(value.expiresAt) - Date.now()));
    this.controller = new AbortController();
    void this.run(generation, this.controller.signal);
    this.schedulePoll(generation, this.controller.signal);
  }
  private current(generation: number) { return !this.disposed && generation === this.generation && this.active !== null; }
  private async run(generation: number, signal: AbortSignal) {
    try {
      while (this.current(generation) && this.active?.status !== "COMPLETED") {
        const value = await this.request<Investigation>(`${root}/${this.active!.investigationId}/run`, { method: "POST", signal });
        if (!this.current(generation)) return;
        if (value.revision >= (this.active?.revision ?? 0)) { this.active = value; this.update(value); }
        if (value.status === "CLOSING") { this.stop(); return; }
      }
      if (this.timer) clearTimeout(this.timer);
    } catch (error) {
      if (!signal.aborted && this.current(generation)) { this.stop(); this.error(error instanceof Error ? error.message : "SOURCE EXECUTION FAILED"); }
    }
  }
  private schedulePoll(generation: number, signal: AbortSignal) {
    if (!this.current(generation) || this.active?.status === "COMPLETED") return;
    this.timer = setTimeout(async () => {
      try {
        const value = await this.request<Investigation>(`${root}/${this.active!.investigationId}`, { signal });
        if (!this.current(generation)) return;
        // Polls only publish an in-flight RUNNING snapshot. Completed run responses own result ordering.
        if (value.revision >= (this.active?.revision ?? 0)) { this.active = value; this.update(value); }
        this.schedulePoll(generation, signal);
      } catch (error) {
        if (!signal.aborted && this.current(generation)) { this.stop(); this.error(error instanceof Error ? error.message : "INVESTIGATION STATUS UNAVAILABLE"); }
      }
    }, 1200);
  }
  private stop() {
    ++this.generation;
    this.controller?.abort();
    this.controller = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (this.expiry) clearTimeout(this.expiry);
    this.expiry = undefined;
  }
  async close() {
    const id = this.active?.investigationId;
    this.stop();
    if (!id) return;
    const result = await this.request<{ cleanupConfirmed: boolean }>(`${root}/${id}`, { method: "DELETE", signal: AbortSignal.timeout(15_000) });
    if (!result.cleanupConfirmed) throw new Error("Cleanup not confirmed. Retry Close.");
    this.active = null;
    if (!this.disposed) this.update(null);
  }
  dispose() {
    this.disposed = true;
    this.stop();
    const id = this.active?.investigationId;
    this.active = null;
    if (id) void this.request(`${root}/${id}`, { method: "DELETE", keepalive: true }).catch(() => {
      // Navigation cannot await cleanup; the server's absolute TTL is the final fallback.
      console.warn("Investigation cleanup could not be confirmed after navigation; temporary data will expire.");
    });
  }
}
