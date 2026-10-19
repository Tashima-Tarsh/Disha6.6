import fs from "node:fs";
import path from "node:path";

export interface DatasetMeta {
  category: string;
  filename: string;
  filePath: string;
  recordCount: number;
  columns: string[];
}

export interface DatasetSearchResult {
  category: string;
  sourceFile: string;
  data: Record<string, string>;
  relevanceScore: number;
}

export class DatasetsService {
  private static instance: DatasetsService | null = null;
  private datasetsDir: string;
  private manifest: DatasetMeta[] = [];
  private cachedRows: Map<string, Array<Record<string, string>>> = new Map();

  private constructor() {
    const candidates = [
      path.resolve(process.cwd(), "data/datasets"),
      path.resolve(process.cwd(), "../data/datasets"),
      path.resolve(process.cwd(), "web/data/datasets"),
      "D:\\Disha6.6\\data\\datasets",
      "D:\\Disha6.6\\web\\data\\datasets",
    ];

    this.datasetsDir = candidates.find((d) => fs.existsSync(d)) || candidates[0];
    this.scanCatalog();
  }

  public static getInstance(): DatasetsService {
    if (!DatasetsService.instance) {
      DatasetsService.instance = new DatasetsService();
    }
    return DatasetsService.instance;
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  private scanCatalog(): void {
    if (!fs.existsSync(this.datasetsDir)) return;

    try {
      const categories = fs.readdirSync(this.datasetsDir, { withFileTypes: true });
      for (const cat of categories) {
        if (!cat.isDirectory()) continue;
        const catPath = path.join(this.datasetsDir, cat.name);
        const files = fs.readdirSync(catPath, { withFileTypes: true });

        for (const f of files) {
          if (!f.isFile() || (!f.name.endsWith(".csv") && !f.name.endsWith(".cv"))) continue;
          const fullPath = path.join(catPath, f.name);

          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
            if (lines.length > 0) {
              const headers = this.parseCSVLine(lines[0]);
              this.manifest.push({
                category: cat.name,
                filename: f.name,
                filePath: fullPath,
                recordCount: Math.max(0, lines.length - 1),
                columns: headers,
              });
            }
          } catch {
            // Ignore unparseable individual CSV
          }
        }
      }
    } catch {
      // Graceful degraded catalog
    }
  }

  private loadRows(meta: DatasetMeta): Array<Record<string, string>> {
    const key = `${meta.category}/${meta.filename}`;
    if (this.cachedRows.has(key)) {
      return this.cachedRows.get(key)!;
    }

    try {
      const content = fs.readFileSync(meta.filePath, "utf-8");
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) return [];

      const headers = this.parseCSVLine(lines[0]);
      const records: Array<Record<string, string>> = [];

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
          if (headers[j]) {
            row[headers[j]] = values[j] || "";
          }
        }
        records.push(row);
      }

      this.cachedRows.set(key, records);
      return records;
    } catch {
      return [];
    }
  }

  public listDatasets(): DatasetMeta[] {
    return this.manifest;
  }

  public searchDatasets(query: string, maxResults = 10): DatasetSearchResult[] {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery || cleanQuery.length < 2) return [];

    const tokens = cleanQuery.split(/\s+/).filter((t) => t.length > 1);
    const results: DatasetSearchResult[] = [];

    // Prioritize high-value OSINT/breach/finance datasets
    const highValueCategories = [
      "Biggest-Data-Breaches",
      "Sony-Pictures-Hack",
      "Cryptocurrencies",
      "Interpol-Most-Wanted",
      "Drone-Strike-Tracker",
      "Tax-havens",
      "WikiLeaks-SpyFiles-Interactive",
      "Artificial-Intelligence",
      "Russia-and-the-West-Military-Encounters",
    ];

    const sortedManifest = [...this.manifest].sort((a, b) => {
      const aVal = highValueCategories.includes(a.category) ? 1 : 0;
      const bVal = highValueCategories.includes(b.category) ? 1 : 0;
      return bVal - aVal;
    });

    for (const meta of sortedManifest) {
      const rows = this.loadRows(meta);

      for (const row of rows) {
        let matchScore = 0;
        const rowText = Object.values(row).join(" ").toLowerCase();

        for (const token of tokens) {
          if (rowText.includes(token)) {
            matchScore += 1;
            // Higher weight if exact entity/name/description hit
            if (row.Entity?.toLowerCase().includes(token) || row.Name?.toLowerCase().includes(token) || row.Company?.toLowerCase().includes(token)) {
              matchScore += 2;
            }
          }
        }

        if (matchScore > 0) {
          results.push({
            category: meta.category,
            sourceFile: meta.filename,
            data: row,
            relevanceScore: matchScore,
          });
        }

        if (results.length >= maxResults * 3) break;
      }

      if (results.length >= maxResults * 3) break;
    }

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }

  public getPromptAugmentation(query: string): string {
    const hits = this.searchDatasets(query, 5);
    if (!hits.length) return "";

    const lines: string[] = [
      `[HISTORICAL & PUBLIC DATASET EVIDENCE (${hits.length} corroborating records)]`,
    ];

    for (const hit of hits) {
      const snippet = Object.entries(hit.data)
        .slice(0, 6)
        .filter(([, v]) => v && v.trim().length > 0 && !v.startsWith("http"))
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");

      lines.push(`- [${hit.category}] ${snippet}`);
    }

    lines.push(`Provenance: Ingested local curated intelligence repository (Section 63 BSA audit-ready).`);
    return lines.join("\n");
  }
}

