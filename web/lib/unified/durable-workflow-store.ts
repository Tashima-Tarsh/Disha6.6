import { getDbPool } from "../server/db";
import { hashValue } from "./hash";
import { emitRuntimeEvent } from "./runtime-event-bus";

export type WorkStatus = "queued" | "leased" | "completed" | "failed" | "dead";
export type DurableWorkItem = {
  workId: string; workflowType: string; dedupeKey?: string; priority: number; status: WorkStatus; payload: Record<string, unknown>;
  result?: unknown; availableAt: string; leaseOwner?: string; leaseExpiresAt?: string; attempts: number; maxAttempts: number; lastError?: string;
  createdAt: string; updatedAt: string; completedAt?: string;
};
const memory = new Map<string, DurableWorkItem>();

export async function enqueueWorkflow(input: { workflowType: string; dedupeKey?: string; priority?: number; payload: Record<string, unknown>; availableAt?: string; maxAttempts?: number }): Promise<DurableWorkItem> {
  const now = new Date().toISOString();
  const dedupeKey = input.dedupeKey?.trim() || undefined;
  const workId = `work-${hashValue({ type: input.workflowType, dedupeKey: dedupeKey ?? hashValue(input.payload) }).slice(0,24)}`;
  const base: DurableWorkItem = { workId, workflowType: input.workflowType, dedupeKey, priority: Math.max(0, Math.min(1000, Math.trunc(input.priority ?? 100))), status: "queued", payload: input.payload, availableAt: input.availableAt ?? now, attempts: 0, maxAttempts: Math.max(1, Math.min(20, Math.trunc(input.maxAttempts ?? 5))), createdAt: now, updatedAt: now };
  const pool = getDbPool();
  if (!pool) {
    const existing = [...memory.values()].find((item) => dedupeKey && item.workflowType === input.workflowType && item.dedupeKey === dedupeKey);
    if (existing) return existing;
    memory.set(workId, base); return base;
  }
  const result = await pool.query(
    `insert into durable_work_items (work_id,workflow_type,dedupe_key,priority,status,payload,available_at,attempts,max_attempts,created_at,updated_at)
     values ($1,$2,$3,$4,'queued',$5::jsonb,$6,0,$7,$8,$8)
     on conflict (workflow_type,dedupe_key) where dedupe_key is not null do update set updated_at=durable_work_items.updated_at
     returning *`, [workId,input.workflowType,dedupeKey??null,base.priority,JSON.stringify(input.payload),base.availableAt,base.maxAttempts,now]);
  const item = rowToWork(result.rows[0] as Record<string, unknown>);
  await emitRuntimeEvent("workflow.queued", { workId:item.workId, workflowType:item.workflowType, priority:item.priority }, item.workId);
  return item;
}

export async function leaseWorkflowItems(input: { workerId: string; workflowTypes?: string[]; maxItems?: number; leaseSeconds?: number; now?: Date }): Promise<DurableWorkItem[]> {
  const now = input.now ?? new Date(); const maxItems=Math.max(1,Math.min(100,input.maxItems??10)); const leaseSeconds=Math.max(15,Math.min(3600,input.leaseSeconds??120));
  const pool=getDbPool();
  if(!pool){
    const eligible=[...memory.values()].filter((item)=> (item.status==="queued" || (item.status==="leased" && Date.parse(item.leaseExpiresAt??"")<=now.getTime())) && Date.parse(item.availableAt)<=now.getTime() && (!input.workflowTypes?.length || input.workflowTypes.includes(item.workflowType))).sort((a,b)=>b.priority-a.priority||Date.parse(a.createdAt)-Date.parse(b.createdAt)).slice(0,maxItems);
    return eligible.map((item)=>{const leased={...item,status:"leased" as const,leaseOwner:input.workerId,leaseExpiresAt:new Date(now.getTime()+leaseSeconds*1000).toISOString(),attempts:item.attempts+1,updatedAt:now.toISOString()};memory.set(item.workId,leased);return leased;});
  }
  const client=await pool.connect();
  try{
    await client.query("begin");
    const result=await client.query(
      `with candidates as (
         select work_id from durable_work_items
         where (status='queued' or (status='leased' and lease_expires_at <= $1)) and available_at <= $1
           and ($2::text[] is null or workflow_type = any($2::text[]))
         order by priority desc, available_at asc, created_at asc
         for update skip locked limit $3
       )
        update durable_work_items w set status='leased',lease_owner=$4,lease_expires_at=$1::timestamptz + make_interval(secs => $5::int),attempts=w.attempts+1,updated_at=$1::timestamptz
        from candidates c where w.work_id=c.work_id returning w.*`, [now.toISOString(),input.workflowTypes?.length?input.workflowTypes:null,maxItems,input.workerId,leaseSeconds]);
    await client.query("commit"); return result.rows.map((row: Record<string, unknown>)=>rowToWork(row));
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}


export async function renewWorkflowLease(workId: string, workerId: string, leaseSeconds = 120): Promise<boolean> {
  const seconds = Math.max(15, Math.min(3600, Math.trunc(leaseSeconds)));
  const pool = getDbPool();
  const now = new Date();
  if (!pool) {
    const item = memory.get(workId);
    if (!item || item.status !== "leased" || item.leaseOwner !== workerId) return false;
    memory.set(workId, { ...item, leaseExpiresAt: new Date(now.getTime() + seconds * 1000).toISOString(), updatedAt: now.toISOString() });
    return true;
  }
  const result = await pool.query(
    `update durable_work_items set lease_expires_at=$3::timestamptz + make_interval(secs => $4::int),updated_at=$3::timestamptz where work_id=$1 and status='leased' and lease_owner=$2`,
    [workId, workerId, now.toISOString(), seconds],
  );
  return Boolean(result.rowCount);
}

export async function completeWorkflow(workId:string,workerId:string,resultValue:unknown):Promise<boolean>{
  const pool=getDbPool(); const now=new Date().toISOString();
  if(!pool){const item=memory.get(workId);if(!item||item.status!=="leased"||item.leaseOwner!==workerId)return false;memory.set(workId,{...item,status:"completed",result:resultValue,leaseOwner:undefined,leaseExpiresAt:undefined,updatedAt:now,completedAt:now});return true;}
  const result=await pool.query(`update durable_work_items set status='completed',result=$3::jsonb,lease_owner=null,lease_expires_at=null,completed_at=$4,updated_at=$4 where work_id=$1 and status='leased' and lease_owner=$2`,[workId,workerId,JSON.stringify(resultValue??null),now]);
  if(result.rowCount)await emitRuntimeEvent("workflow.completed",{workId},workId);return Boolean(result.rowCount);
}

export async function failWorkflow(workId:string,workerId:string,error:unknown):Promise<DurableWorkItem|null>{
  const message=(error instanceof Error?error.message:String(error)).slice(0,4000); const pool=getDbPool(); const now=new Date();
  if(!pool){const item=memory.get(workId);if(!item||item.status!=="leased"||item.leaseOwner!==workerId)return null;const dead=item.attempts>=item.maxAttempts;const updated={...item,status:(dead?"dead":"queued") as WorkStatus,lastError:message,leaseOwner:undefined,leaseExpiresAt:undefined,availableAt:dead?item.availableAt:new Date(now.getTime()+retryDelayMs(item.attempts)).toISOString(),updatedAt:now.toISOString()};memory.set(workId,updated);return updated;}
  const result=await pool.query(
    `update durable_work_items set status=case when attempts>=max_attempts then 'dead' else 'queued' end,last_error=$3,lease_owner=null,lease_expires_at=null,
       available_at=case when attempts>=max_attempts then available_at else $4::timestamptz + make_interval(secs => least(3600, power(2,greatest(0,attempts-1))::int * 15)) end,updated_at=$4::timestamptz
     where work_id=$1 and status='leased' and lease_owner=$2 returning *`,[workId,workerId,message,now.toISOString()]);
  if(!result.rowCount)return null;const item=rowToWork(result.rows[0] as Record<string,unknown>);await emitRuntimeEvent(item.status==="dead"?"workflow.dead":"workflow.retry_scheduled",{workId,error:message,attempts:item.attempts},workId);return item;
}

export async function listWorkItems(limit=100):Promise<DurableWorkItem[]>{const bounded=Math.max(1,Math.min(1000,limit));const pool=getDbPool();if(!pool)return[...memory.values()].sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)).slice(0,bounded);const result=await pool.query(`select * from durable_work_items order by updated_at desc limit $1`,[bounded]);return result.rows.map((row: Record<string, unknown>)=>rowToWork(row));}
function rowToWork(row:Record<string,unknown>):DurableWorkItem{return{workId:String(row.work_id),workflowType:String(row.workflow_type),dedupeKey:row.dedupe_key?String(row.dedupe_key):undefined,priority:Number(row.priority),status:String(row.status) as WorkStatus,payload:typeof row.payload==="object"&&row.payload?row.payload as Record<string,unknown>:{},result:row.result,availableAt:new Date(String(row.available_at)).toISOString(),leaseOwner:row.lease_owner?String(row.lease_owner):undefined,leaseExpiresAt:row.lease_expires_at?new Date(String(row.lease_expires_at)).toISOString():undefined,attempts:Number(row.attempts),maxAttempts:Number(row.max_attempts),lastError:row.last_error?String(row.last_error):undefined,createdAt:new Date(String(row.created_at)).toISOString(),updatedAt:new Date(String(row.updated_at)).toISOString(),completedAt:row.completed_at?new Date(String(row.completed_at)).toISOString():undefined};}
function retryDelayMs(attempts:number):number{return Math.min(3_600_000,15_000*Math.pow(2,Math.max(0,attempts-1)));}
export function clearWorkflowStoreForTests():void{memory.clear();}
