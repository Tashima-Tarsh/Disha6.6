import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Pool } = pg;

const [geojsonPath, manifestPath] = process.argv.slice(2);
if (!geojsonPath || !manifestPath) {
  console.error("Usage: node scripts/geospatial/import-authoritative-geojson.mjs <normalized.geojson> <manifest.json>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const raw = await fs.readFile(path.resolve(geojsonPath));
const manifest = JSON.parse(await fs.readFile(path.resolve(manifestPath), "utf8"));
const sourceHash = crypto.createHash("sha256").update(raw).digest("hex");
if (manifest.sourceHash !== sourceHash && manifest.sourceHash !== "auto") throw new Error("Manifest sourceHash does not match the GeoJSON bytes");
manifest.sourceHash = sourceHash;
for (const field of ["sourceId","sourceUrl","productId","retrievalTimestamp","sourceCrs","normalizedCrs","licenseNote","attribution","importJobId","datasetId","reviewedBy"]) {
  if (!String(manifest[field] ?? "").trim()) throw new Error(`Manifest field ${field} is required`);
}
if (manifest.normalizedCrs !== "EPSG:4326") throw new Error("Normalized GeoJSON must be EPSG:4326 before DISHA admission");
if (manifest.admissionStatus !== "admitted") throw new Error("Import is blocked until admissionStatus is exactly admitted");

const collection = JSON.parse(raw.toString("utf8"));
if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) throw new Error("Input must be a GeoJSON FeatureCollection");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: "-c search_path=public,extensions" });
const client = await pool.connect();
let invalid = 0;
let repaired = 0;
let mapped = 0;
try {
  await client.query("begin");
  await client.query("select pg_advisory_xact_lock(hashtext('disha-geospatial-import'))");
  await client.query(
    `insert into geospatial_import_jobs
      (import_job_id,source_id,product_id,product_version,source_hash,source_crs,normalized_crs,license_note,attribution,status,feature_count_in,metadata,started_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'staged',$10,$11::jsonb,now())
     on conflict (import_job_id) do update set metadata=excluded.metadata`,
    [manifest.importJobId,manifest.sourceId,manifest.productId,manifest.productVersion ?? null,sourceHash,manifest.sourceCrs,manifest.normalizedCrs,manifest.licenseNote,manifest.attribution,collection.features.length,JSON.stringify({reviewedBy:manifest.reviewedBy,notes:manifest.notes ?? null})],
  );
  await client.query(
    `insert into geospatial_datasets
      (dataset_id,import_job_id,source_id,source_url,product_id,product_version,retrieval_timestamp,source_hash,source_crs,normalized_crs,license_note,attribution,geography_levels,status,metadata)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'staged',$14::jsonb)
     on conflict (dataset_id) do update set metadata=excluded.metadata`,
    [manifest.datasetId,manifest.importJobId,manifest.sourceId,manifest.sourceUrl,manifest.productId,manifest.productVersion ?? null,manifest.retrievalTimestamp,sourceHash,manifest.sourceCrs,manifest.normalizedCrs,manifest.licenseNote,manifest.attribution,manifest.geographyLevels ?? [],JSON.stringify({reviewedBy:manifest.reviewedBy})],
  );

  let inserted = 0;
  for (let i = 0; i < collection.features.length; i += 1) {
    const feature = collection.features[i];
    if (!feature?.geometry) continue;
    const props = feature.properties && typeof feature.properties === "object" ? feature.properties : {};
    const level = String(props.geography_level ?? props.level ?? manifest.defaultGeographyLevel ?? "").trim().toLowerCase();
    if (!level) throw new Error(`Feature ${i} lacks geography_level`);
    const lgdCode = props.lgd_code ? String(props.lgd_code).trim() : (props.dt_code ? String(props.dt_code).trim() : null);
    if (lgdCode) mapped += 1;
    const name = props.name ? String(props.name) : (props.district ? String(props.district) : (manifest.defaultName ? String(manifest.defaultName) : null));
    const stableKey = String(feature.id ?? props.feature_id ?? lgdCode ?? `${level}:${name ?? i}`);
    const featureId = `geo-${crypto.createHash("sha256").update(`${manifest.datasetId}:${stableKey}`).digest("hex").slice(0,32)}`;
    const sourceRecordHash = crypto.createHash("sha256").update(JSON.stringify({dataset:manifest.datasetId,stableKey,geometry:feature.geometry,properties:props})).digest("hex");
    const provenanceHash = crypto.createHash("sha256").update(JSON.stringify({featureId,sourceHash,sourceRecordHash,reviewedBy:manifest.reviewedBy})).digest("hex");

    const check = await client.query(
      `with raw as (select ST_SetSRID(ST_GeomFromGeoJSON($1),4326) as geom)
       select ST_IsValid(geom) as valid from raw`,
      [JSON.stringify(feature.geometry)],
    );
    if (!check.rows[0]?.valid) { invalid += 1; repaired += 1; }

    await client.query(
      `with raw as (
         select ST_SetSRID(ST_GeomFromGeoJSON($1),4326) as geom
       ), clean as (
         select case when ST_IsValid(geom) then geom else ST_MakeValid(geom) end as geom from raw
       )
       insert into geospatial_features
         (feature_id,dataset_id,feature_type,geography_level,lgd_code,name,properties,geom,source_record_hash,provenance_hash,observed_at,valid_from,valid_to)
       select $2,$3,GeometryType(geom),$4,$5,$6,$7::jsonb,geom,$8,$9,$10,$11,$12 from clean
       on conflict (feature_id) do update set
         properties=excluded.properties,geom=excluded.geom,source_record_hash=excluded.source_record_hash,
         provenance_hash=excluded.provenance_hash,observed_at=excluded.observed_at,valid_from=excluded.valid_from,valid_to=excluded.valid_to`,
      [JSON.stringify(feature.geometry),featureId,manifest.datasetId,level,lgdCode,name,JSON.stringify(props),sourceRecordHash,provenanceHash,manifest.retrievalTimestamp,props.valid_from ?? null,props.valid_to ?? null],
    );
    inserted += 1;
  }

  const coverage = collection.features.length ? mapped / collection.features.length : 0;
  await client.query(
    `update geospatial_import_jobs set status='admitted',feature_count_out=$2,invalid_geometry_count=$3,
       repaired_geometry_count=$4,lgd_mapping_coverage=$5,completed_at=now() where import_job_id=$1`,
    [manifest.importJobId,inserted,invalid,repaired,coverage],
  );
  await client.query("update geospatial_datasets set status='admitted' where dataset_id=$1", [manifest.datasetId]);
  await client.query("commit");
  console.info(JSON.stringify({type:"geospatial_import",status:"success",datasetId:manifest.datasetId,features:inserted,invalid,repaired,lgdMappingCoverage:coverage,sourceHash}));
} catch (error) {
  await client.query("rollback");
  console.error(JSON.stringify({type:"geospatial_import",status:"failure",reason:error instanceof Error?error.message:String(error)}));
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
