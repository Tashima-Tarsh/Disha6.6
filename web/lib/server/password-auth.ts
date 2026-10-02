import { z } from "zod";
import { hashPassword, validatePassword, verifyPassword } from "../../scripts/lib/passwords.mjs";
import { createSession } from "./auth";
import { getDbPool } from "./db";
import { getEnv } from "./env";

const rolesSchema = z.array(z.enum(["admin", "operator", "analyst", "viewer"])).min(1);
const invalidCredentials = () => Object.assign(new Error("Invalid credentials"), { status: 401 });

export async function passwordLogin(email: string, password: string, persistent = true) {
  if (getEnv().DISHA_AUTH_MODE !== "password") throw Object.assign(new Error("Password login is disabled"), { status: 403 });
  const pool = getDbPool();
  if (!pool) throw Object.assign(new Error("Account storage is unavailable"), { status: 503 });
  const result = await pool.query(
    "select user_id, password_hash, disabled_at, locked_until from password_credentials where email = $1",
    [email.trim().toLowerCase()],
  );
  const account = result.rows[0];
  const matches = await verifyPassword(password, account?.password_hash);
  if (!matches || !account || account.disabled_at || (account.locked_until && new Date(account.locked_until).getTime() > Date.now())) {
    if (account && !account.disabled_at) await pool.query(
      `update password_credentials set
       failed_attempts = case when locked_until <= now() then 1 else failed_attempts + 1 end,
       locked_until = case when (case when locked_until <= now() then 0 else failed_attempts end) >= 4 then now() + interval '15 minutes' else null end
       where user_id = $1 and (locked_until is null or locked_until <= now())`, [account.user_id],
    );
    throw invalidCredentials();
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    // Lock the credential until the session is stored. A simultaneous reset cannot leave a live old-password session.
    const admitted = await client.query(
      `select u.id, u.email, u.roles from password_credentials c join users u on u.id = c.user_id
       where c.user_id = $1 and c.password_hash = $2 and c.disabled_at is null
       and (c.locked_until is null or c.locked_until <= now()) for update of c`, [account.user_id, account.password_hash],
    );
    if (!admitted.rowCount) throw invalidCredentials();
    const user = admitted.rows[0];
    await client.query("update password_credentials set failed_attempts = 0, locked_until = null where user_id = $1", [user.id]);
    const session = await createSession(user.email, rolesSchema.parse(user.roles), { persistent, userId: user.id, client });
    await client.query("commit");
    return session;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  validatePassword(newPassword);
  if (currentPassword === newPassword) throw Object.assign(new Error("Choose a different password."), { status: 400 });
  const pool = getDbPool();
  if (!pool) throw Object.assign(new Error("Account storage is unavailable"), { status: 503 });
  const result = await pool.query("select password_hash from password_credentials where user_id = $1 and disabled_at is null", [userId]);
  const previous = result.rows[0]?.password_hash;
  if (!await verifyPassword(currentPassword, previous)) throw invalidCredentials();
  const hash = await hashPassword(newPassword);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const changed = await client.query(
      "update password_credentials set password_hash = $1, failed_attempts = 0, locked_until = null, updated_at = now() where user_id = $2 and password_hash = $3 and disabled_at is null returning user_id",
      [hash, userId, previous],
    );
    if (!changed.rowCount) throw invalidCredentials();
    await client.query("update refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null", [userId]);
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
