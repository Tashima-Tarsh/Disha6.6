import { randomUUID } from 'crypto'

export interface RuntimeAuditEvent {
  requestId: string
  action: string
  outcome: 'success' | 'failure' | 'deny'
  resource?: string
  metadata?: Record<string, unknown>
}

export function createRequestId(): string {
  return randomUUID()
}

export function writeRuntimeAudit(event: RuntimeAuditEvent): void {
  const record = {
    type: 'runtime.audit',
    ts: new Date().toISOString(),
    ...event,
  }
  console.error(JSON.stringify(record))
}
