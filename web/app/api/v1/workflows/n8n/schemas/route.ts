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

    return NextResponse.json(
      {
        format: "n8n-workflow-v1",
        workflow: n8nWorkflowTemplate,
      },
      { headers: { "X-Request-ID": ctx.requestId } }
    );
  });
}
