export type Role = "admin" | "operator" | "analyst" | "viewer";

export type PolicyAction =
  | "chat"
  | "agent:read"
  | "agent:run"
  | "file:read"
  | "file:write"
  | "share:create"
  | "share:read"
  | "share:delete"
  | "export"
  | "audit:read";

export interface Principal {
  userId: string;
  email: string;
  roles: Role[];
  sessionId?: string;
}

export interface RequestContext {
  requestId: string;
  principal: Principal;
}

export interface AuditEvent {
  requestId: string;
  userId?: string;
  action: string;
  resource?: string;
  outcome: "success" | "failure" | "deny";
  critical?: boolean;
  metadata?: Record<string, unknown>;
}
