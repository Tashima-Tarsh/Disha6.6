import type { InvestigationRun } from "@/lib/investigation/types";
import styles from "@/app/investigate/investigate.module.css";
export function InvestigationSourceStatus({ runs }: { runs: InvestigationRun[] }) {
  return <details className={styles.sources} open><summary>Source activity <span>{runs.filter(run => !["QUEUED", "RUNNING"].includes(run.status)).length} / {runs.length}</span></summary><ul>{runs.map(run => <li key={run.adapterId} data-status={run.status}><span className={styles.statusDot} /><div><strong>{run.sourceName}</strong><small>{run.status.replaceAll("_", " ")}{run.status === "COMPLETED" ? ` · ${run.evidenceCount} results` : ""}</small>{run.error && <small className={styles.sourceError}>{run.error}</small>}{run.providerHealth && <small>{run.providerHealth.replaceAll("_", " ")} · stream not used</small>}{run.warnings.map(warning => <small key={warning}>{warning}</small>)}</div></li>)}</ul></details>;
}
