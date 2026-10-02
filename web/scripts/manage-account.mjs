import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import pg from "pg";
import { z } from "zod";
import { hashPassword, validatePassword } from "./lib/passwords.mjs";

const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  email: { type: "string" }, role: { type: "string" }, help: { type: "boolean" },
} });
if (values.help) {
  process.stdout.write("Usage: node scripts/manage-account.mjs <create|reset|disable> --email EMAIL [--role admin|operator|analyst|viewer]\nPasswords are entered privately at the terminal. DATABASE_URL must be configured.\n");
  process.exit(0);
}

let pool;
try {
  const action = z.enum(["create", "reset", "disable"]).parse(positionals[0]);
  if (positionals.length !== 1) throw new Error("Only an account action may be passed as a positional argument.");
  const email = z.string().email().max(254).parse(values.email?.trim().toLowerCase());
  const role = z.enum(["admin", "operator", "analyst", "viewer"]).parse(values.role ?? "analyst");
  if (values.role && action !== "create") throw new Error("Roles are set when creating an account; password reset preserves existing permissions.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be configured for the application's database.");
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, max: 1 });
  await pool.query("select 1 from password_credentials limit 0");
  let passwordHash;
  if (action !== "disable") {
    const password = await readHidden("New password (15–256 characters): ");
    validatePassword(password);
    if (password !== await readHidden("Confirm passphrase: ")) throw new Error("Passwords do not match. No account was changed.");
    passwordHash = await hashPassword(password);
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`account:${email}`]);
    const current = await client.query("select user_id from password_credentials where email = $1 for update", [email]);
    if (action === "create" && current.rowCount) throw new Error("Account already exists. Use auth:reset-password to reset it.");
    if (action !== "create" && !current.rowCount) throw new Error("No password account exists for this email.");
    let userId = current.rows[0]?.user_id;
    if (action === "create") {
      // Never silently attach a password to an existing SSO identity.
      const existing = await client.query("select id from users where lower(email) = $1", [email]);
      if (existing.rowCount) throw new Error("An identity already uses this email. Review its authentication method before creating a password account.");
      userId = `password:${randomUUID()}`;
      await client.query("insert into users (id, email, roles) values ($1, $2, $3)", [userId, email, [role]]);
      await client.query("insert into password_credentials (user_id, email, password_hash) values ($1, $2, $3)", [userId, email, passwordHash]);
    } else if (action === "reset") {
      await client.query("update password_credentials set password_hash = $1, disabled_at = null, failed_attempts = 0, locked_until = null, updated_at = now() where user_id = $2", [passwordHash, userId]);
    } else {
      await client.query("update password_credentials set disabled_at = now(), updated_at = now() where user_id = $1", [userId]);
    }
    await client.query("update refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null", [userId]);
    await client.query("insert into audit_events (request_id, user_id, action, outcome, metadata) values ($1, $2, $3, 'success', $4)",
      [randomUUID(), userId, `auth.account.${action}`, { channel: "operator-cli" }]);
    await client.query("commit");
    process.stdout.write(`Account ${action} succeeded for ${email}. ${action === "disable" ? "Access is revoked." : "Sign in at your application's /login page."}\n`);
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
} catch (error) {
  // Database errors can contain connection details; print only intentional validation messages.
  process.stderr.write(`${error instanceof z.ZodError ? "Invalid action, email or role." : error?.code ? "Database operation failed. Verify connectivity and run db:migrate." : error.message}\n`);
  process.exitCode = 1;
} finally { await pool?.end(); }

function readHidden(prompt) {
  if (!process.stdin.isTTY) throw new Error("Password entry requires an interactive terminal. Do not pass passwords as arguments or pipe them.");
  process.stdout.write(prompt);
  return new Promise((resolve, reject) => {
    let value = "";
    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const finish = (error) => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(Boolean(wasRaw));
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error); else resolve(value);
    };
    const onData = (chunk) => {
      for (const char of chunk.toString("utf8")) {
        if (char === "\u0003" || char === "\u0004") { finish(new Error("Cancelled. No account was changed.")); return; }
        if (char === "\r" || char === "\n") { finish(); return; }
        if (char === "\u007f" || char === "\b") value = [...value].slice(0, -1).join("");
        else if (char >= " " && value.length < 257) value += char;
      }
    };
    process.stdin.on("data", onData);
  });
}
