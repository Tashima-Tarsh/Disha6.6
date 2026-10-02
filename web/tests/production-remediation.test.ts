import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import edge from "../cloudflare-proxy";
import { getEnv, resetEnvForTests } from "../lib/server/env";
import { issueOtpChallenge } from "../lib/server/otp";
import { checkedWorkspacePath } from "../lib/server/security";
import { runMission, getMission, getMissionEvidence, clearMissionsForTests, missionReportPayload } from "../lib/unified/orchestrator";
import { clearEvidenceLedgerForTests } from "../lib/unified/evidence-ledger";
import { hashValue } from "../lib/unified/hash";
import { isPublicAddress } from "../lib/server/safe-public-fetch";
import { safeReturnUrl } from "../lib/server/return-url";
import { listOperationalGeoFeatures } from "../lib/geospatial/spatial-query";
import { enqueueWorkflow, clearWorkflowStoreForTests } from "../lib/unified/durable-workflow-store";
vi.mock("../lib/server/db", () => ({ getDbPool: () => null }));
beforeEach(() => { vi.stubEnv("NODE_ENV", "test"); resetEnvForTests(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); resetEnvForTests(); });
const env = { DISHA_ORIGIN_URL: "https://origin.example" };
it("edge fails closed without a production origin", async () => {
 const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
 expect((await edge.fetch(new Request("https://edge.example/login"))).status).toBe(503);expect(fetcher).not.toHaveBeenCalled();
});
it("edge relays login HTML once and never injects telemetry", async () => {
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("<html>login</html>",{headers:{"content-type":"text/html"}})));
 expect(await (await edge.fetch(new Request("https://edge.example/login"),env)).text()).toBe("<html>login</html>");
});
it("edge preserves POST query and upstream auth rejection", async () => {
 const fetcher=vi.fn(async(req:Request)=>{expect(await req.json()).toEqual({query:"example.com"});return Response.json({error:"Unauthorized"},{status:401});});vi.stubGlobal("fetch",fetcher);
 const response=await edge.fetch(new Request("https://edge.example/api/v1/surveillance/osint-search",{method:"POST",body:JSON.stringify({query:"example.com"})}),env);
 expect(response.status).toBe(401);expect(await response.json()).toEqual({error:"Unauthorized"});
});
it("failed edge upstream produces an error without invented evidence",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("offline")));
 const response=await edge.fetch(new Request("https://edge.example/api/v1/surveillance/osint-search?q=example.com"),env);
 expect(response.status).toBe(502);expect(await response.json()).not.toHaveProperty("runs");
});
it("double-slash paths cannot change the configured upstream",async()=>{
 vi.stubGlobal("fetch",vi.fn(async(req:Request)=>{expect(new URL(req.url).origin).toBe(env.DISHA_ORIGIN_URL);return new Response("ok");}));
 await edge.fetch(new Request("https://edge.example//untrusted.example/path"),env);
});
it("invalid production environment never becomes cached",()=>{
 vi.stubEnv("NODE_ENV","production");vi.stubEnv("DISHA_AUTH_MODE","dev-jwt");vi.stubEnv("DISHA_JWT_SECRET","a".repeat(32));vi.stubEnv("DATABASE_URL","postgres://unused");vi.stubEnv("DISHA_WORKER_TOKEN","b".repeat(32));resetEnvForTests();
 expect(()=>getEnv()).toThrow("not allowed");expect(()=>getEnv()).toThrow("not allowed");
});
it("production OTP fails closed without a real delivery service",()=>{
 vi.stubEnv("NODE_ENV","production");vi.stubEnv("DISHA_AUTH_MODE","oidc");vi.stubEnv("DISHA_JWT_SECRET","a".repeat(32));vi.stubEnv("DISHA_WORKER_TOKEN","b".repeat(32));vi.stubEnv("DATABASE_URL","postgres://unused");vi.stubEnv("REDIS_URL","redis://unused");vi.stubEnv("DISHA_OIDC_ISSUER","https://issuer.example");vi.stubEnv("DISHA_OIDC_CLIENT_ID","id");vi.stubEnv("DISHA_OIDC_CLIENT_SECRET","secret");vi.stubEnv("DISHA_OIDC_ALLOWED_EMAILS","a@example.com");resetEnvForTests();
 expect(()=>issueOtpChallenge(new NextResponse(),"9999999999")).toThrow("no verified delivery provider");
});
it("workspace refuses symlink escape and secret files",async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"disha-regression-"));
 try{await fs.mkdir(path.join(root,"workspace"));await fs.writeFile(path.join(root,"outside.txt"),"synthetic test marker");await fs.symlink(path.join(root,"outside.txt"),path.join(root,"workspace","link.txt"));vi.stubEnv("DISHA_WORKSPACE_ROOT",path.join(root,"workspace"));await expect(checkedWorkspacePath("link.txt")).rejects.toThrow("symlinks");await expect(checkedWorkspacePath(".env")).rejects.toThrow("Restricted");}finally{await fs.rm(root,{recursive:true,force:true});}
});
it("a second user cannot replace a mission or append to its ledger",async()=>{
 await clearMissionsForTests();await clearEvidenceLedgerForTests();await runMission({missionId:"owned-mission",rawText:"report",userId:"alice",userRole:"analyst"});const before=await getMissionEvidence("owned-mission");
 await expect(runMission({missionId:"owned-mission",rawText:"report",userId:"bob",userRole:"analyst"})).rejects.toMatchObject({status:409});
 expect((await getMission("owned-mission"))?.signal.userId).toBe("alice");expect(await getMissionEvidence("owned-mission")).toHaveLength(before.length);
});
it("report hash has a reproducible non-circular payload",async()=>{
 await clearMissionsForTests();await clearEvidenceLedgerForTests();const mission=await runMission({rawText:"report",userId:"alice",userRole:"analyst"});const events=await getMissionEvidence(mission.missionId);expect(events.find(event=>event.action==="report_generated")!.outputHash).toBe(hashValue(missionReportPayload(mission)));
});
it("missing spatial database returns zero geographic observations",async()=>{expect((await listOperationalGeoFeatures()).features).toEqual([]);});
it.each(["127.0.0.1","10.1.2.3","172.16.0.1","169.254.169.254","::1","::","::ffff:172.16.0.1","::ffff:a9fe:a9fe","fe80::1","ff02::1"])("blocks non-public address %s",address=>{expect(isPublicAddress(address)).toBe(false);});
it("accepts global unicast IPs",()=>{expect(isPublicAddress("8.8.8.8")).toBe(true);expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);});
it.each(["//evil.example","/\\evil.example","/\nevil.example"])("rejects unsafe redirect %s",value=>{expect(safeReturnUrl(value)).toBe("/dashboard");});
it("non-deduplicated identical jobs get distinct identifiers",async()=>{clearWorkflowStoreForTests();const first=await enqueueWorkflow({workflowType:"test",payload:{id:1}});const second=await enqueueWorkflow({workflowType:"test",payload:{id:1}});expect(first.workId).not.toBe(second.workId);});
it("OSINT route rejects unauthenticated requests before execution",async()=>{
 const {GET}=await import("../app/api/v1/surveillance/osint-search/route");
 const response=await GET(new NextRequest("http://localhost/api/v1/surveillance/osint-search?q=example.com"));expect(response.status).toBe(401);
});
