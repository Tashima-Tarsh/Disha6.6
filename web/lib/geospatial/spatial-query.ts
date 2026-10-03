import { getDbPool } from "@/lib/server/db";
import type { GeospatialRuntimeStatus, OperationalFeatureCollection, OperationalGeoFeature } from "./contracts";

type FeatureFilter = {
  geographyLevel?: string;
  lgdCode?: string;
  query?: string;
  limit?: number;
};

type RadiusFilter = FeatureFilter & {
  lon: number;
  lat: number;
  radiusM: number;
};

export async function getGeospatialRuntimeStatus(): Promise<GeospatialRuntimeStatus> {
  const pool = getDbPool();
  if (!pool) return { database: "unconfigured", postgis: false, admittedDatasets: 0, admittedFeatures: 0, latestDataset: null };
  try {
    const extension = await pool.query("select exists(select 1 from pg_extension where extname='postgis') as enabled");
    const counts = await pool.query(`
      select
        (select count(*)::int from geospatial_datasets where status='admitted') as datasets,
        (select count(*)::int from geospatial_features f join geospatial_datasets d on d.dataset_id=f.dataset_id where d.status='admitted') as features
    `);
    const latest = await pool.query(`
      select dataset_id,source_id,product_id,product_version,imported_at,attribution
      from geospatial_datasets
      where status='admitted'
      order by imported_at desc
      limit 1
    `);
    const row = latest.rows[0];
    return {
      database: "ready",
      postgis: Boolean(extension.rows[0]?.enabled),
      admittedDatasets: Number(counts.rows[0]?.datasets ?? 0),
      admittedFeatures: Number(counts.rows[0]?.features ?? 0),
      latestDataset: row ? {
        datasetId: String(row.dataset_id),
        sourceId: String(row.source_id),
        productId: String(row.product_id),
        productVersion: row.product_version ? String(row.product_version) : null,
        importedAt: new Date(String(row.imported_at)).toISOString(),
        attribution: String(row.attribution),
      } : null,
    };
  } catch {
    return { database: "error", postgis: false, admittedDatasets: 0, admittedFeatures: 0, latestDataset: null };
  }
}

export async function listOperationalGeoFeatures(filter: FeatureFilter = {}): Promise<OperationalFeatureCollection> {
  const pool = getDbPool();
  if (!pool) return { type: "FeatureCollection", features: [] };
  const limit = boundLimit(filter.limit);
  const values: unknown[] = [];
  const predicates = ["d.status='admitted'"];
  if (filter.geographyLevel) {
    values.push(filter.geographyLevel.toLowerCase());
    predicates.push(`lower(f.geography_level)=$${values.length}`);
  }
  if (filter.lgdCode) {
    values.push(filter.lgdCode);
    predicates.push(`f.lgd_code=$${values.length}`);
  }
  if (filter.query) {
    values.push(`%${filter.query.trim()}%`);
    predicates.push(`f.name ilike $${values.length}`);
  }
  values.push(limit);
  return queryFeatures(`
    select ${featureSelect()}
    from geospatial_features f
    join geospatial_datasets d on d.dataset_id=f.dataset_id
    where ${predicates.join(" and ")}
    order by f.observed_at desc, f.feature_id
    limit $${values.length}
  `, values);
}

export async function featuresWithinRadius(filter: RadiusFilter): Promise<OperationalFeatureCollection> {
  const pool = getDbPool();
  if (!pool) return { type: "FeatureCollection", features: [] };
  const limit = boundLimit(filter.limit);
  const values: unknown[] = [filter.lon, filter.lat, filter.radiusM];
  const predicates = [
    "d.status='admitted'",
    "ST_DWithin(f.geog, ST_SetSRID(ST_Point($1,$2),4326)::geography, $3)",
  ];
  if (filter.geographyLevel) {
    values.push(filter.geographyLevel.toLowerCase());
    predicates.push(`lower(f.geography_level)=$${values.length}`);
  }
  values.push(limit);
  return queryFeatures(`
    select ${featureSelect()},
      ST_Distance(f.geog, ST_SetSRID(ST_Point($1,$2),4326)::geography) as distance_m
    from geospatial_features f
    join geospatial_datasets d on d.dataset_id=f.dataset_id
    where ${predicates.join(" and ")}
    order by distance_m asc, f.feature_id
    limit $${values.length}
  `, values);
}

export async function featuresContainingPoint(input: { lon: number; lat: number; geographyLevel?: string; limit?: number }): Promise<OperationalFeatureCollection> {
  const pool = getDbPool();
  if (!pool) return { type: "FeatureCollection", features: [] };
  const values: unknown[] = [input.lon, input.lat];
  const predicates = [
    "d.status='admitted'",
    "ST_Covers(f.geom, ST_SetSRID(ST_Point($1,$2),4326))",
  ];
  if (input.geographyLevel) {
    values.push(input.geographyLevel.toLowerCase());
    predicates.push(`lower(f.geography_level)=$${values.length}`);
  }
  values.push(boundLimit(input.limit));
  return queryFeatures(`
    select ${featureSelect()}
    from geospatial_features f
    join geospatial_datasets d on d.dataset_id=f.dataset_id
    where ${predicates.join(" and ")}
    order by f.geography_level, f.feature_id
    limit $${values.length}
  `, values);
}

function featureSelect(): string {
  return `
    f.feature_id,f.dataset_id,f.feature_type,f.geography_level,f.lgd_code,f.name,
    f.source_record_hash,f.provenance_hash,f.observed_at,
    d.source_id,d.source_url,d.product_id,d.product_version,d.attribution,
    ST_AsGeoJSON(f.geom)::json as geometry,
    coalesce((
      select json_agg(json_build_object(
        'linkType',l.link_type,'refId',l.ref_id,'sourceHash',l.source_hash,'provenanceHash',l.provenance_hash
      ) order by l.link_type,l.ref_id)
      from geospatial_feature_links l where l.feature_id=f.feature_id
    ), '[]'::json) as links
  `;
}

async function queryFeatures(sql: string, values: unknown[]): Promise<OperationalFeatureCollection> {
  const pool = getDbPool();
  if (!pool) return { type: "FeatureCollection", features: [] };
  try {
    const result = await pool.query(sql, values);
    return {
      type: "FeatureCollection",
      features: result.rows.map(rowToFeature),
    };
  } catch (error) {
    if (isMissingGeoSchema(error)) return { type: "FeatureCollection", features: [] };
    throw error;
  }
}

function rowToFeature(row: Record<string, unknown>): OperationalGeoFeature {
  return {
    type: "Feature",
    id: String(row.feature_id),
    geometry: row.geometry as OperationalGeoFeature["geometry"],
    properties: {
      featureId: String(row.feature_id),
      datasetId: String(row.dataset_id),
      sourceId: String(row.source_id),
      sourceUrl: String(row.source_url),
      productId: String(row.product_id),
      productVersion: row.product_version ? String(row.product_version) : null,
      geographyLevel: String(row.geography_level),
      lgdCode: row.lgd_code ? String(row.lgd_code) : null,
      name: row.name ? String(row.name) : null,
      sourceRecordHash: String(row.source_record_hash),
      provenanceHash: String(row.provenance_hash),
      observedAt: new Date(String(row.observed_at)).toISOString(),
      attribution: String(row.attribution),
      links: Array.isArray(row.links) ? row.links as OperationalGeoFeature["properties"]["links"] : [],
    },
  };
}

function boundLimit(value?: number): number {
  return Math.max(1, Math.min(1000, Math.trunc(value ?? 250)));
}

function isMissingGeoSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("geospatial_") && (message.includes("does not exist") || message.includes("undefined_table"));
}
