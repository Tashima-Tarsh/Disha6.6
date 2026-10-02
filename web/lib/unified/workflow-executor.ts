import { failWorkflow, completeWorkflow, leaseWorkflowItems, renewWorkflowLease, type DurableWorkItem } from "./durable-workflow-store";
import { runChangeDrivenActivation, type IntelligenceActivationInput } from "./intelligence-activation";
import { runScheduledSourceIngestion } from "./scheduled-source-ingestion";
import { runContinuousOsintWatch } from "./continuous-osint";

export type WorkflowTickResult = { workerId: string; leased: number; completed: string[]; failed: Array<{ workId: string; error: string }> };

export async function processWorkflowTick(input: { workerId: string; maxJobs?: number; leaseSeconds?: number }): Promise<WorkflowTickResult> {
  const completed: string[] = []; const failed: Array<{workId:string;error:string}> = [];
  let leased = 0;
  for (let index = 0; index < (input.maxJobs ?? 10); index++) {
    const [item] = await leaseWorkflowItems({ workerId: input.workerId, workflowTypes: ["source_ingestion","osint_watch","intelligence_activation"], maxItems: 1, leaseSeconds: input.leaseSeconds ?? 120 });
    if (!item) break;
    leased += 1;
    const leaseSeconds = input.leaseSeconds ?? 120;
    const heartbeat = setInterval(() => { void renewWorkflowLease(item.workId, input.workerId, leaseSeconds).catch((error: unknown) => console.error("workflow_lease_renewal_failed", error)); }, Math.max(5_000, Math.floor(leaseSeconds * 1000 / 3)));
    try {
      const result = await execute(item);
      if (!await completeWorkflow(item.workId, input.workerId, result)) throw new Error("workflow_lease_lost_before_completion");
      completed.push(item.workId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await failWorkflow(item.workId, input.workerId, error); failed.push({ workId:item.workId,error:message });
    } finally {
      clearInterval(heartbeat);
    }
  }
  return { workerId: input.workerId, leased, completed, failed };
}

async function execute(item: DurableWorkItem): Promise<unknown> {
  if (item.workflowType === "source_ingestion") {
    const sourceId = typeof item.payload.sourceId === "string" ? item.payload.sourceId : "";
    if (!sourceId) throw new Error("source_ingestion_work_missing_source_id");
    const summary = await runScheduledSourceIngestion({ sourceIds: [sourceId] });
    const retryableFailures = summary.runs.filter((run) => run.status === "failed");
    if (retryableFailures.length) {
      throw new Error(`source_ingestion_failed:${retryableFailures.map((run) => run.sourceId).join(",")}`);
    }
    return summary;
  }
  if (item.workflowType === "osint_watch") {
    const watchId = typeof item.payload.watchId === "string" ? item.payload.watchId : "";
    if (!watchId) throw new Error("osint_watch_work_missing_watch_id");
    const result = await runContinuousOsintWatch(watchId);
    if (["failed", "timed_out"].includes(result.status)) {
      throw new Error(`osint_watch_failed:${watchId}:${result.error ?? result.status}`);
    }
    return result;
  }
  if (item.workflowType === "intelligence_activation") {
    const result = await runChangeDrivenActivation(item.payload as unknown as IntelligenceActivationInput);
    if (result.status === "failed") throw new Error("intelligence_activation_all_components_unavailable");
    return result;
  }
  throw new Error(`unsupported_workflow_type:${item.workflowType}`);
}
