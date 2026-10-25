import crypto from "node:crypto";
import pg from "../web/node_modules/pg/lib/index.js";

const { Client } = pg;

function hashSecret(secret, salt = crypto.randomBytes(16).toString("base64url")) {
  const hash = crypto.scryptSync(secret, salt, 64).toString("base64url");
  return `${salt}:${hash}`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://osint:osint@127.0.0.1:5432/osint";
  const client = new Client({ connectionString });
  await client.connect();

  const password = "DishaPortal@2026!";
  const passwordHash = hashSecret(password);

  await client.query(
    `INSERT INTO users (id, email, roles, password_hash, created_at)
     VALUES
       ('admin-1', 'admin@disha.gov.in', ARRAY['admin', 'operator', 'analyst'], $1, NOW()),
       ('analyst-1', 'analyst@disha.gov.in', ARRAY['analyst'], $1, NOW())
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles`,
    [passwordHash],
  );

  const res = await client.query("SELECT id, email, roles FROM users");
  console.log("SEEDED_USERS:", JSON.stringify(res.rows, null, 2));

  await client.end();
}

main().catch(console.error);
