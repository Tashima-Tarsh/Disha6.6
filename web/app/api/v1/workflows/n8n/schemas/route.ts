import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const n8nWorkflowTemplate = {
      name: "DISHA 6.6 Sovereign Intelligence & Event Automation",
      nodes: [
        {
          parameters: {
            httpMethod: "POST",
            path: "disha-events",
            responseMode: "onReceived",
            responseData: "allEntries",
          },
          name: "Webhook Trigger",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [250, 300],
        },
        {
          parameters: {
            requestMethod: "POST",
            url: "http://localhost:3000/api/v1/workflows/n8n/webhook",
            jsonParameters: true,
            options: {},
            bodyParametersJson: JSON.stringify({
              eventType: "TRIGGER_INVESTIGATION",
              target: "={{$json.body.target}}",
              targetType: "={{$json.body.targetType || 'person_name'}}",
              source: "n8n-live-orchestrator",
            }),
          },
          name: "DISHA Sovereign Bridge",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [500, 300],
        },
      ],
      connections: {
        "Webhook Trigger": {
          main: [
            [
              {
                node: "DISHA Sovereign Bridge",
                type: "main",
                index: 0,
              },
            ],
          ],
        },
      },
      settings: {
        executionOrder: "v1",
      },
    };


    // Governed multi-skill execution: import this second workflow into n8n,
    // attach HTTP Header Auth with Authorization: Bearer <DISHA service token>,
    // and set DISHA_BASE_URL in the n8n environment. No secrets are exported.
    const governedSkillWorkflowTemplate = {
      name: "DISHA 6.6 — Governed Multi-Skill Orchestration",
      nodes: [
        {
          parameters: {
            httpMethod: "POST",
            path: "disha-governed-skills",
            responseMode: "onReceived",
            options: {},
          },
          name: "Governed Skill Trigger",
          type: "n8n-nodes-base.webhook",
          typeVersion: 2,
          position: [250, 300],
        },
        {
          parameters: {
            method: "POST",
            url: "={{$env.DISHA_BASE_URL}}/api/v1/workflows/n8n/skills",
            authentication: "genericCredentialType",
            genericAuthType: "httpHeaderAuth",
            sendBody: true,
            specifyBody: "json",
            jsonBody: "={{ JSON.stringify($json.body) }}",
            options: {},
          },
          name: "DISHA Governed Skills",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [525, 300],
        },
      ],
      connections: {
        "Governed Skill Trigger": {
          main: [[{ node: "DISHA Governed Skills", type: "main", index: 0 }]],
        },
      },
      settings: { executionOrder: "v1" },
    };
    return NextResponse.json(
      {
        format: "n8n-workflow-v1",
        workflow: n8nWorkflowTemplate,
        governedSkillWorkflow: governedSkillWorkflowTemplate,
        governedSkillEndpoint: "/api/v1/workflows/n8n/skills",
        credentialsRequired: "n8n HTTP Header Auth with a DISHA Bearer token",
      },
      { headers: { "X-Request-ID": ctx.requestId } }
    );
  });
}
