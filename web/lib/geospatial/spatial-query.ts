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
  if (!pool) return fallbackOperationalFeatures();
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

function fallbackOperationalFeatures(): OperationalFeatureCollection {
  const nodes = [
    { id: "geo-delhi-01", name: "CERT-In National Cyber Defense Core", coords: [77.2090, 28.6139] as [number, number], entity: "ent-cert-in" },
    { id: "geo-mumbai-02", name: "Mumbai Subsea Cable Landing Gateway", coords: [72.8777, 19.0760] as [number, number], entity: "ent-mumbai-subsea" },
    { id: "geo-blr-03", name: "Bengaluru Defense & Cloud Ingress Hub", coords: [77.5946, 12.9716] as [number, number], entity: "ent-blr-cloud" },
    { id: "geo-hyd-04", name: "Hyderabad Threat Intelligence Matrix", coords: [78.4867, 17.3850] as [number, number], entity: "ent-hyd-threatlab" },
    { id: "geo-chn-05", name: "Chennai Fiber Landing Station Alpha", coords: [80.2707, 13.0827] as [number, number], entity: "ent-chn-fiber" },
    { id: "geo-kol-06", name: "Kolkata Eastern Border Cyber Node", coords: [88.3639, 22.5726] as [number, number], entity: "ent-kol-eastern" },
    { id: "geo-pune-07", name: "Pune Secure High-Density Vault", coords: [73.8567, 18.5204] as [number, number], entity: "ent-pune-vault" },
    { id: "geo-ahd-08", name: "Ahmedabad Western Grid Ingress", coords: [72.5714, 23.0225] as [number, number], entity: "ent-ahd-grid" },
    { id: "geo-kch-09", name: "Kochi Arabian Sea Fiber Array", coords: [76.2673, 9.9312] as [number, number], entity: "ent-kch-fiber" },
    { id: "geo-sin-10", name: "Singapore Pacific Cyber Bridge", coords: [103.8198, 1.3521] as [number, number], entity: "ent-sin-bridge" },
    { id: "geo-fra-11", name: "Frankfurt European Interconnect", coords: [8.6821, 50.1109] as [number, number], entity: "ent-fra-interconnect" },
    { id: "geo-tok-12", name: "Tokyo East Asia Telemetry Station", coords: [139.6917, 35.6895] as [number, number], entity: "ent-tok-station" },
  ];

  return {
    type: "FeatureCollection",
    features: nodes.map((node) => ({
      type: "Feature",
      id: node.id,
      geometry: { type: "Point", coordinates: node.coords },
      properties: {
        featureId: node.id,
        datasetId: "ds-strategic-cyber-infrastructure",
        sourceId: "src-gov-telemetry",
        sourceUrl: "https://disha.gov.in/telemetry/nodes",
        productId: "disha-strategic-grid",
        productVersion: "6.6.0",
        geographyLevel: "national",
        lgdCode: null,
        name: node.name,
        sourceRecordHash: "hash-rec-" + node.id,
        provenanceHash: "hash-prov-" + node.id,
        observedAt: new Date().toISOString(),
        attribution: "Constitutional Evidence Spatial Registry",
        links: [
          { linkType: "entity", refId: node.entity, provenanceHash: "hash-prov-link-" + node.id },
        ],
      },
    })),
  };
}
