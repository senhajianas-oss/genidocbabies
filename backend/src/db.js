let pool = null;
let workerEnv = null;

/**
 * Lazy-load MySQL only when needed (and if we are in Node.js)
 */
async function getPool() {
  if (pool) return pool;
  if (typeof process !== "undefined" && process.env && process.env.DB_HOST) {
    try {
      const mysql = eval('require("mysql2/promise")');
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT || 3306),
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: true,
      });
      return pool;
    } catch (e) {
      console.warn("MySQL pool creation failed:", e.message);
    }
  }
  return null;
}

function setEnv(env) {
  workerEnv = env;
  if (env && typeof process !== "undefined") {
    try {
      if (!process.env) process.env = {};
      for (const key in env) {
        if (typeof env[key] === 'string' && !process.env[key]) {
          process.env[key] = env[key];
        }
      }
    } catch (e) {
      console.warn("Env shimming failed:", e.message);
    }
  }
}

/**
 * Converts named placeholders (:name) to positional (?) for D1
 */
function convertNamedToPositional(sql, params) {
  if (!params || Array.isArray(params)) return { sql, params };

  const positionalParams = [];
  const newSql = sql.replace(/:(\w+)/g, (match, key) => {
    const val = params[key];
    positionalParams.push(val === undefined ? null : val);
    return "?";
  });

  return { sql: newSql, params: positionalParams };
}

// Universal execute function to handle both MySQL and Cloudflare D1
async function execute(sql, params = [], env) {
  const targetEnv = env || workerEnv;

  try {
    if (targetEnv && targetEnv.DB) {
      const { sql: d1Sql, params: d1Params } = convertNamedToPositional(sql, params);
      const stmt = targetEnv.DB.prepare(d1Sql).bind(...d1Params);

      if (sql.trim().toUpperCase().startsWith("SELECT")) {
        const { results } = await stmt.all();
        return [results || []];
      } else {
        const result = await stmt.run();
        return [{
          insertId: (result.meta && (result.meta.last_row_id || result.meta.lastRowId)) || 0,
          affectedRows: (result.meta && result.meta.changes) || 0
        }];
      }
    }

    const activePool = await getPool();
    if (activePool) {
      return await activePool.execute(sql, params);
    }

    throw new Error("No database connection (Check your bindings or local DB)");
  } catch (err) {
    console.error("DB Execute Error:", err.message, "| SQL:", sql);
    throw err;
  }
}

async function getConnection() {
  return {
    execute: (sql, params, env) => execute(sql, params, env),
    beginTransaction: async () => { },
    commit: async () => { },
    rollback: async () => { },
    release: () => { }
  };
}

module.exports = { execute, getConnection, setEnv };