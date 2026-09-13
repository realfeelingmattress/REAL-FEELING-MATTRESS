import "./env.js";
import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import path from "node:path";

const context = new AsyncLocalStorage();
export const databaseKind = process.env.DATABASE_URL ? "postgres" : "sqlite";
if (process.env.VERCEL && databaseKind !== "postgres")
  throw new Error(
    "Vercel requires DATABASE_URL. Local SQLite is not durable on Vercel. Run the cloud setup first.",
  );
if (
  process.env.VERCEL &&
  (process.env.DB_AUTO_SETUP === "1" || process.env.DB_SEED_DEMO === "1")
)
  throw new Error("Vercel cannot run automatic migrations or demo seeding.");
let sqlite, pool;
if (databaseKind === "postgres") {
  const { Pool, types } = await import("pg");
  types.setTypeParser(20, (value) => {
    const n = Number(value);
    if (!Number.isSafeInteger(n))
      throw new Error("Database integer exceeds safe range");
    return n;
  });
  types.setTypeParser(1700, Number);
  types.setTypeParser(1184, (value) => new Date(value).toISOString());
  const url = new URL(process.env.DATABASE_URL);
  const local = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(
    url.hostname,
  );
  const tls = local
    ? false
    : {
        rejectUnauthorized: true,
        ...(process.env.PG_CA_CERT ? { ca: process.env.PG_CA_CERT } : {}),
      };
  for (const key of [
    "ssl",
    "sslmode",
    "sslcert",
    "sslkey",
    "sslrootcert",
    "uselibpqcompat",
    "channel_binding",
  ])
    url.searchParams.delete(key);
  pool = new Pool({
    connectionString: url.toString(),
    ssl: tls,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 15000,
    application_name: "real-feeling-mattress",
  });
  if (process.env.VERCEL) {
    const { attachDatabasePool } = await import("@vercel/functions");
    attachDatabasePool(pool);
  }
} else {
  const { default: Database } = await import("better-sqlite3");
  const filename = process.env.DB_PATH || "data/nocte.sqlite";
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
}
// A connection-scoped transaction context prevents other SQLite requests from
// entering an open transaction, and pins each PostgreSQL transaction to its own
// pool connection. No synchronous network calls or worker-thread DB bridge.
let tail = Promise.resolve(),
  savepoint = 0;
async function exclusive(fn) {
  let release;
  const previous = tail;
  tail = new Promise((r) => (release = r));
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}
export function postgresSql(input) {
  let sql = input.replace(/\bINSERT OR IGNORE INTO\b/gi, "INSERT INTO");
  if (/\bINSERT OR IGNORE INTO\b/i.test(input))
    sql += " ON CONFLICT DO NOTHING";
  sql = sql
    .replace(/\bINTEGER\b/gi, "BIGINT")
    .replace(
      /created TEXT DEFAULT CURRENT_TIMESTAMP/gi,
      "created TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
    )
    .replace(/ORDER BY rowid/gi, "ORDER BY id")
    .replace(/AS googleLinked/gi, 'AS "googleLinked"');
  let result = "",
    quote = "",
    count = 0;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (quote) {
      result += c;
      if (c === quote) {
        if (sql[i + 1] === quote) {
          result += sql[++i];
        } else quote = "";
      }
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      result += c;
    } else result += c === "?" ? "$" + ++count : c;
  }
  return result;
}
async function query(sql, args = [], mode = "all") {
  const values = args.map((v) =>
    typeof v === "boolean" ? Number(v) : v === undefined ? null : v,
  );
  const execute = async () => {
    if (sqlite) {
      if (mode === "exec") {
        sqlite.exec(sql);
        return;
      }
      const stmt = sqlite.prepare(sql);
      return mode === "run"
        ? stmt.run(...values)
        : mode === "get"
          ? stmt.get(...values)
          : stmt.all(...values);
    }
    const client = context.getStore()?.client || pool;
    if (/^PRAGMA table_info\(\w+\)$/i.test(sql.trim())) {
      const table = sql.match(/\((\w+)\)/)[1];
      const r = await client.query(
        "SELECT column_name AS name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1",
        [table],
      );
      return r.rows;
    }
    const r = await client.query(postgresSql(sql), values);
    return mode === "run"
      ? { changes: r.rowCount }
      : mode === "get"
        ? r.rows[0]
        : mode === "exec"
          ? undefined
          : r.rows;
  };
  return sqlite && !context.getStore() ? exclusive(execute) : execute();
}
export const db = {
  kind: databaseKind,
  prepare(sql) {
    return {
      all: (...args) => query(sql, args, "all"),
      get: (...args) => query(sql, args, "get"),
      run: (...args) => query(sql, args, "run"),
    };
  },
  exec: (sql) => query(sql, [], "exec"),
  transaction(fn) {
    return async (...args) => {
      const parent = context.getStore();
      if (parent) {
        const name = "rfm_save_" + ++savepoint;
        await query("SAVEPOINT " + name, [], "exec");
        try {
          const result = await fn(...args);
          await query("RELEASE SAVEPOINT " + name, [], "exec");
          return result;
        } catch (e) {
          await query("ROLLBACK TO SAVEPOINT " + name, [], "exec");
          throw e;
        }
      }
      const run = async () => {
        const client = pool ? await pool.connect() : null;
        try {
          return await context.run({ client }, async () => {
            await query(
              pool ? "BEGIN ISOLATION LEVEL SERIALIZABLE" : "BEGIN IMMEDIATE",
              [],
              "exec",
            );
            try {
              const result = await fn(...args);
              await query("COMMIT", [], "exec");
              return result;
            } catch (e) {
              await query("ROLLBACK", [], "exec");
              throw e;
            }
          });
        } finally {
          client?.release();
        }
      };
      if (sqlite) return exclusive(run);
      for (let attempt = 0; ; attempt++) {
        try {
          return await run();
        } catch (e) {
          if (!["40001", "40P01"].includes(e.code) || attempt >= 3) throw e;
        }
      }
    };
  },
  async close() {
    if (sqlite) sqlite.close();
    else await pool.end();
  },
};
