import crypto from "node:crypto";
import process from "node:process";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
const email = (process.env.DISHA_USER_EMAIL ?? "").trim().toLowerCase();
const password = process.env.DISHA_USER_PASSWORD ?? "";
const roles = (process.env.DISHA_USER_ROLES ?? "analyst")
  .split(",")
  .map((role) => role.trim())
  .filter((role) => role === "analyst" || role === "admin");

if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!email || !email.includes("@")) throw new Error("DISHA_USER_EMAIL must be a valid email address");
if (password.length < 12) throw new Error("DISHA_USER_PASSWORD must be at least 12 characters");
if (roles.length === 0) throw new Error("DISHA_USER_ROLES must include analyst or admin");

const salt = crypto.randomBytes(16).toString("base64url");
const hash = crypto.scryptSync(password, salt, 64).toString("base64url");
const encoded = `${salt}:${hash}`;

const pool = new Pool({ connectionString: databaseUrl });
try {
  await pool.query(
    `insert into users (id, email, roles, password_hash, disabled_at)
     values ($1, $2, $3, $4, null)
     on conflict (email) do update
       set roles = excluded.roles,
           password_hash = excluded.password_hash,
           disabled_at = null`,
    [email, email, roles, encoded],
  );
  process.stdout.write(JSON.stringify({ status: "updated", email, roles }) + "\n");
} finally {
  await pool.end();
}
