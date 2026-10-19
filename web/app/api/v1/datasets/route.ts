import { NextRequest, NextResponse } from "next/server";
import { withContext } from "@/lib/unified/api";
import { DatasetsService } from "@/lib/unified/datasets-service";

export async function GET(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const service = DatasetsService.getInstance();
    const list = service.listDatasets();

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (query) {
      const results = service.searchDatasets(query, 25);
      return NextResponse.json(
        {
          query,
          totalResults: results.length,
          results,
        },
        { headers: { "X-Request-ID": ctx.requestId } }
      );
    }

    const categories = Array.from(new Set(list.map((d) => d.category)));

    return NextResponse.json(
      {
        totalDatasets: list.length,
        totalCategories: categories.length,
        categories,
        datasets: list,
      },
      { headers: { "X-Request-ID": ctx.requestId } }
    );
  });
}

export async function POST(req: NextRequest) {
  return withContext(req, "agent:read", async (ctx) => {
    const body = (await req.json()) as { query?: string; maxResults?: number };
    const query = body.query?.trim();

    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const service = DatasetsService.getInstance();
    const results = service.searchDatasets(query, body.maxResults || 20);

    return NextResponse.json(
      {
        query,
        count: results.length,
        results,
      },
      { headers: { "X-Request-ID": ctx.requestId } }
    );
  });
}

