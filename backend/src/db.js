const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

let pool;
if (process.env.DB_HOST) {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true, // Keep it true for MySQL
  });
}

/**
 * Converts named placeholders (:name) to positional (?) for D1
 */
function convertNamedToPositional(sql, params) {
  if (!params || Array.isArray(params)) return { sql, params };

  const positionalParams = [];
  const newSql = sql.replace(/:(\w+)/g, (match, key) => {
    positionalParams.push(params[key]);
    return "?";
  });

  return { sql: newSql, params: positionalParams };
}

// Global env reference for workers
let workerEnv = null;
function setEnv(env) {
  workerEnv = env;
  // Shim process.env for controllers that use it (requires nodejs_compat)
  if (env) {
    for (const key in env) {
      if (typeof env[key] === 'string') {
        process.env[key] = env[key];
      }
    }
  }
}

// Universal execute function to handle both MySQL and Cloudflare D1
async function execute(sql, params = [], env) {
  const targetEnv = env || workerEnv;

  // 1. Check for Cloudflare D1
  if (targetEnv && targetEnv.DB) {
    const { sql: d1Sql, params: d1Params } = convertNamedToPositional(sql, params);
    const stmt = targetEnv.DB.prepare(d1Sql).bind(...d1Params);

    if (sql.trim().toUpperCase().startsWith("SELECT")) {
      const { results } = await stmt.all();
      return [results];
    } else {
      const result = await stmt.run();
      return [{ insertId: result.meta.last_row_id || 0, affectedRows: result.meta.changes }];
    }
  }

  // 2. Fallback to MySQL Local
  if (pool) {
    return await pool.execute(sql, params);
  }

  throw new Error("No database connection available (MySQL or D1)");
}

// Dummy getConnection to avoid breaking controllers
async function getConnection() {
  return {
    execute: (sql, params, env) => execute(sql, params, env),
    beginTransaction: async () => { }, // D1 doesn't support manual transactions easily
    commit: async () => { },
    rollback: async () => { },
    release: () => { }
  };
}

module.exports = { execute, getConnection, setEnv };