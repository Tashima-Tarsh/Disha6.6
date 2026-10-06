import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { InvestigationService } from "../services/investigation/service";
import { classifyTarget, investigationInput, planInvestigation } from "../services/investigation/plan";
import { normalizeRecords } from "../services/investigation/normalize";
import { analyzeImage } from "../services/investigation/image";
import { safeReturnUrl } from "../lib/auth-navigation";
import { openTemporary, sealTemporary, type InvestigationStore, type TemporaryInvestigation } from "../lib/server/investigation-store";
import type { AdapterExecutionResult } from "../lib/unified/osint-adapter-bus";
import type { AdapterPlan } from "../lib/investigation/types";
import { createDefaultOsintBus } from "../lib/unified/osint-default-bus";
import type { RequestContext } from "../lib/server/types";

const ctx: RequestContext = { requestId: "test-request", principal: { userId: "test-owner", email: "owner@example.com", roles: ["analyst"] } };
const operatorCtx: RequestContext = { requestId: "operator-request", principal: { userId: "test-operator", email: "operator@example.com", roles: ["operator"] } };
const result = (adapterId: string, data: unknown): AdapterExecutionResult<unknown> => ({ adapterId, status: "completed", data, evidence: [{ id: "lookup-summary", sourceId: "provider", sourceName: "Test provider", sourceUrl: "https://example.org/source", summary: "Lookup completed", retrievedAt: "2026-10-03T00:00:00Z", provenanceHash: "provider-hash" }], warnings: [], attempts: 1, durationMs: 2 });
class MemoryStore implements InvestigationStore {
  states = new Map<string, TemporaryInvestigation>(); images = new Map<string, Buffer>(); locks = new Map<string, string>(); stops = new Set<string>(); owners = new Map<string, string>();
  async create(value: TemporaryInvestigation, image?: Buffer) { this.states.set(value.investigationId, structuredClone(value)); this.owners.set(value.investigationId, value.ownerId); if (image) this.images.set(value.investigationId, Buffer.from(image)); }
  async authorized(id: string, owner: string) { return this.owners.get(id) === owner; }
  async read(id: string) { return this.states.has(id) ? structuredClone(this.states.get(id)!) : null; }
  async save(value: TemporaryInvestigation) { if (this.stops.has(value.investigationId) || !this.states.has(value.investigationId)) return false; this.states.set(value.investigationId, structuredClone(value)); return true; }
  async image(id: string) { const image = this.images.get(id); return image ? Buffer.from(image) : null; }
  async acquire(id: string) { if (this.locks.has(id) || this.stops.has(id)) return null; this.locks.set(id, "lease"); return "lease"; }
  async release(id: string) { this.locks.delete(id); }
  async busy(id: string) { return this.locks.has(id); }
  async stop(id: string) { this.stops.add(id); }
  async stopped(id: string) { return this.stops.has(id); }
  async remove(id: string) { this.states.delete(id); this.images.delete(id); }
  async budget() { return true; }
}
afterEach(() => vi.unstubAllEnvs());
describe("search-first routing and classification", () => {
  it.each([undefined, "", "//evil.example", "/\\evil.example", "/%5cevil.example", "/api/auth/logout", "/login", "https://evil.example"])("defaults safely to /investigate for %s", value => expect(safeReturnUrl(value)).toBe("/investigate"));
  it("preserves explicit internal return destinations", () => expect(safeReturnUrl("/operations?view=graph")).toBe("/operations?view=graph"));
  it.each(["/dashboard?view=old", "/dashboard/legacy"])( "retires legacy dashboard returns into the investigation universe for %s", value => expect(safeReturnUrl(value)).toBe("/investigate"));
  it.each([["Nitish Kumar", "person_name"], ["person@example.com", "email"], ["+1 (202) 555-0123", "phone"], ["@example", "username"], ["Acme Ltd", "company"], ["example.com", "domain"], ["8.8.8.8", "ip"], ["2001:4860:4860::8888", "ip"], ["AS13335", "asn"], ["https://example.com/path", "url"], ["CVE-2026-12345", "cve"], ["NORAD 25544", "norad_id"], ["DL-01-AB-1234", "vehicle_identifier"], ["d41d8cd98f00b204e9800998ecf8427e", "file_hash"], ["https://github.com/Tashima-Tarsh/Disha6.6", "repository"], ["AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD", "certificate"]])("classifies %s as %s", (query, type) => expect(classifyTarget(query).targetType).toBe(type));
  it("supports explicit general topics and validates country codes", () => { expect(classifyTarget("climate change", "topic").targetType).toBe("topic"); expect(() => classifyTarget("9876543210")).toThrow(/country code/); expect(() => classifyTarget("+99912345678")).toThrow(); });
  it("rejects unsupported overrides, oversized values, and control characters", () => { expect(investigationInput.safeParse({ target: "a".repeat(513) }).success).toBe(false); expect(investigationInput.safeParse({ target: "name", targetType: "admin" }).success).toBe(false); expect(() => classifyTarget("some text", "ip")).toThrow(); });
  it("uses registered adapter identifiers and valid target-specific inputs", () => {
    const registered = new Set(createDefaultOsintBus().list().map(item => item.id));
    for (const [target, type] of [["example.com", "domain"], ["8.8.8.8", "ip"], ["AS13335", "asn"], ["CVE-2026-12345", "cve"], ["25544", "norad_id"]] as const) for (const plan of planInvestigation(target, type)) expect(registered.has(plan.adapterId) || plan.adapterId === "passive-shodan").toBe(true);
    expect(planInvestigation("CVE-2026-12345", "cve").find(plan => plan.adapterId === "public-nvd-cve")?.input).toEqual({ cve: "CVE-2026-12345" });
    expect(planInvestigation("https://example.com/path", "url").find(plan => plan.adapterId === "public-dns-google")?.input.domain).toBe("example.com");
    const vehicle = planInvestigation("DL01AB1234", "vehicle_identifier");
    expect(vehicle.find(plan => plan.adapterId === "public-india-vehicle-format")?.input).toEqual({ registration: "DL01AB1234" });
    expect(vehicle.find(plan => plan.adapterId === "authorized-vahan-registry")?.initialStatus).toBe("RESTRICTED");
  });
  it("requires both deployment and per-investigation approval for identity workers", () => {
    vi.stubEnv("DATABASE_URL", "postgres://test");
    vi.stubEnv("DISHA_ASTRA6_ALL_TOOLS_ENABLED", "true");
    vi.stubEnv("DISHA_IDENTITY_ENUMERATION_APPROVED", "true");
    const restricted = planInvestigation("+12025550123", "phone");
    expect(restricted.find(plan => plan.adapterId === "astra6-phoneinfoga")?.initialStatus).toBe("RESTRICTED");
    const approved = planInvestigation("+12025550123", "phone", { identityAuthorized: true });
    const phone = approved.find(plan => plan.adapterId === "astra6-phoneinfoga");
    expect(phone?.initialStatus).toBeUndefined();
    expect(phone?.input.identityAuthorization).toBe(true);
  });
});
describe("truthful source records and temporary lifecycle", () => {
  it("never promotes a successful empty lookup summary into intelligence", () => {
    const plan: AdapterPlan = { adapterId: "public-wikidata-search", sourceName: "Wikidata", input: {}, reason: "test" };
    expect(normalizeRecords(plan, result(plan.adapterId, { entities: [] }))).toEqual([]);
    expect(normalizeRecords(plan, result(plan.adapterId, undefined))).toEqual([]);
    expect(normalizeRecords({ ...plan, adapterId: "public-nvd-cve" }, result("public-nvd-cve", { found: false }))).toEqual([]);
  });
  it("separates distinct same-name entity records without invented matches", async () => {
    const store = new MemoryStore(); const execute = vi.fn(async (plan: AdapterPlan) => result(plan.adapterId, { entities: [{ id: "Q1", label: "Shared name", description: "First record", conceptUri: "https://www.wikidata.org/wiki/Q1" }, { id: "Q2", label: "Shared name", description: "Second record", conceptUri: "https://www.wikidata.org/wiki/Q2" }] }));
    const log = vi.fn(async () => {}); const service = new InvestigationService(store, execute, log);
    const created = await service.create({ target: "Shared name" }, ctx); expect(created.evidence).toHaveLength(0);
    const updated = await service.advance(created.investigationId, ctx);
    expect(updated.candidateClusters).toHaveLength(2); expect(updated.candidateClusters.map(c => c.attributes.providerRecordId)).toEqual(["Q1", "Q2"]);
    expect(updated.candidateClusters.every(c => c.status === "POSSIBLE_MATCH")).toBe(true);
    expect(updated.evidence.every(e => /^[a-f0-9]{64}$/.test(e.contentHash) && e.corroborationState === "unverified")).toBe(true);
    expect(updated.edges.every(edge => updated.evidence.some(e => e.evidenceId === edge.evidenceId))).toBe(true);
    expect(JSON.stringify(log.mock.calls)).not.toContain("Shared name");
  });
  it.each(["person_name", "email", "phone"] as const)("executes a real backend plan for %s", async type => {
    const store = new MemoryStore(); const execute = vi.fn(async (plan: AdapterPlan) => result(plan.adapterId, { entities: [], articles: [], records: [] }));
    const service = new InvestigationService(store, execute, async () => {});
    const created = await service.create({ target: type === "email" ? "person@example.com" : type === "phone" ? "+12025550123" : "Shared name", targetType: type }, ctx);
    const updated = await service.advance(created.investigationId, ctx); expect(execute).toHaveBeenCalledOnce(); expect(updated.evidence).toHaveLength(0); expect(updated.candidateClusters).toHaveLength(0); expect(updated.runs.some(run => run.status === "NO_RESULTS")).toBe(true);
  });
  it("keeps blocked and unconfigured sources unexecuted", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", ""); const store = new MemoryStore(); const execute = vi.fn(async (plan: AdapterPlan) => result(plan.adapterId, { articles: [] })); const service = new InvestigationService(store, execute, async () => {});
    const created = await service.create({ target: "person@example.com" }, ctx); const updated = await service.advance(created.investigationId, ctx);
    expect(updated.runs.find(r => r.adapterId === "restricted-private-data")?.status).toBe("BLOCKED"); expect(updated.runs.find(r => r.adapterId === "public-brave-search")?.status).toBe("NOT_CONFIGURED"); expect(updated.status).toBe("COMPLETED"); expect(execute).toHaveBeenCalledTimes(1);
  });
  it("limits explicit identity authorization to operator or admin roles", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://test");
    vi.stubEnv("DISHA_ASTRA6_ALL_TOOLS_ENABLED", "true");
    vi.stubEnv("DISHA_IDENTITY_ENUMERATION_APPROVED", "true");
    const store = new MemoryStore();
    const service = new InvestigationService(store, undefined, async () => {});
    await expect(service.create({ target: "+12025550123", targetType: "phone", identityAuthorization: true }, ctx)).rejects.toMatchObject({ status: 403 });
    const created = await service.create({ target: "+12025550123", targetType: "phone", identityAuthorization: true }, operatorCtx);
    expect(created.runs.find(run => run.adapterId === "astra6-phoneinfoga")?.status).toBe("QUEUED");
  });
  it("checks ownership on reads, executions and closure", async () => {
    const store = new MemoryStore(); const service = new InvestigationService(store, undefined, async () => {}); const created = await service.create({ target: "example.com" }, ctx); const stranger = { ...ctx, principal: { ...ctx.principal, userId: "stranger" } };
    await expect(service.get(created.investigationId, "stranger")).rejects.toMatchObject({ status: 404 }); await expect(service.advance(created.investigationId, stranger)).rejects.toMatchObject({ status: 404 }); await expect(service.close(created.investigationId, stranger)).rejects.toMatchObject({ status: 404 });
  });
  it("cancels in-flight execution, waits for cleanup, and fences late results", async () => {
    const store = new MemoryStore(); let began!: () => void; const running = new Promise<void>(resolve => { began = resolve; });
    const execute = vi.fn((_plan: AdapterPlan, _owner: string, _id: string, signal: AbortSignal) => new Promise<AdapterExecutionResult<unknown>>((_, reject) => { began(); signal.addEventListener("abort", () => reject(new Error("adapter_cancelled")), { once: true }); }));
    const service = new InvestigationService(store, execute, async () => {}); const created = await service.create({ target: "example.com" }, ctx);
    const execution = service.advance(created.investigationId, ctx).catch(error => error); await running;
    expect((await service.get(created.investigationId, ctx.principal.userId)).runs[0].status).toBe("RUNNING");
    expect(await service.close(created.investigationId, ctx)).toMatchObject({ status: "CLOSED", cleanupConfirmed: true }); await execution;
    expect(await store.read(created.investigationId)).toBeNull(); expect(await store.busy(created.investigationId)).toBe(false);
    expect(await store.save({ ...created, ownerId: ctx.principal.userId })).toBe(false); expect(await service.close(created.investigationId, ctx)).toMatchObject({ cleanupConfirmed: true });
    const next = await service.create({ target: "another.example" }, ctx); expect(next.evidence).toEqual([]); expect(next.candidateClusters).toEqual([]);
  });
  it("validates image contents, derives hashes, and deletes temporary uploads", async () => {
    const image = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#203040" } }).png().toBuffer();
    const metadata = await analyzeImage(image, "image/png"); expect(metadata.perceptualHash).toHaveLength(16); expect(metadata.sha256).toHaveLength(64);
    await expect(analyzeImage(image, "image/jpeg")).rejects.toMatchObject({ status: 415 }); await expect(analyzeImage(Buffer.from("not an image"), "image/png")).rejects.toMatchObject({ status: 415 });
    const store = new MemoryStore(); const service = new InvestigationService(store, undefined, async () => {}); const created = await service.create(undefined, ctx, { bytes: image, type: "image/png" }); expect(created.targetType).toBe("image"); expect(await store.image(created.investigationId)).toEqual(image);
    await service.close(created.investigationId, ctx); expect(await store.image(created.investigationId)).toBeNull();
  });
  it("expires abandoned sessions and removes their data", async () => {
    const store = new MemoryStore(); const service = new InvestigationService(store, undefined, async () => {}); const created = await service.create({ target: "example.com" }, ctx); store.states.get(created.investigationId)!.expiresAt = new Date(0).toISOString();
    await expect(service.get(created.investigationId, ctx.principal.userId)).rejects.toMatchObject({ status: 410 }); expect(store.states.size).toBe(0);
  });
  it("encrypts temporary content with authenticated encryption", () => {
    vi.stubEnv("DISHA_INVESTIGATION_KEY", "test-encryption-key-of-at-least-32-bytes"); const input = Buffer.from("sensitive temporary record"); const sealed = sealTemporary(input); expect(sealed).not.toContain(input.toString()); expect(openTemporary(sealed)).toEqual(input);
    const changed = Buffer.from(sealed, "base64"); changed[30] ^= 1; expect(() => openTemporary(changed.toString("base64"))).toThrow();
  });
});
