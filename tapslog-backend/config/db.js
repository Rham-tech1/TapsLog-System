/**
 * config/db.js — Dual-Environment PostgreSQL Connection Pool
 * Supports seamless switching between:
 *  1. Local PostgreSQL (localhost:5432)
 *  2. Cloud Supabase PostgreSQL (Transaction pooler on port 6543 / Session on 5432)
 *
 * Automatically applies SSL ({ rejectUnauthorized: false }) when connecting to Supabase
 * or when DB_SSL=true / NODE_ENV=production.
 */

const { Pool } = require('pg');
require('dotenv').config();

function createDatabasePool() {
  const isProduction = process.env.NODE_ENV === 'production';
  const forceSsl = process.env.DB_SSL === 'true';
  const databaseUrl = process.env.DATABASE_URL;

  // Determine if connecting to Supabase or remote cloud host
  const isSupabase =
    (databaseUrl && databaseUrl.includes('supabase.co')) ||
    (process.env.DB_HOST && process.env.DB_HOST.includes('supabase.co'));

  const useSsl = isProduction || forceSsl || isSupabase;

  const sslConfig = useSsl ? { rejectUnauthorized: false } : false;

  let poolConfig;

  if (databaseUrl) {
    // Mode A: Connection String (e.g. Supabase pooled connection string)
    poolConfig = {
      connectionString: databaseUrl,
      ssl: sslConfig,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
  } else {
    // Mode B: Discrete Parameters (e.g. local PostgreSQL)
    poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'tapslog_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: sslConfig,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
  }

  const pool = new Pool(poolConfig);

  pool.on('connect', (client) => {
    const target = isSupabase ? 'Cloud Supabase' : 'Local PostgreSQL';
    console.log(`[TapsLog DB] Client connected to ${target} (SSL: ${Boolean(useSsl)})`);
  });

  pool.on('error', (err) => {
    console.error('[TapsLog DB] Unexpected error on idle client:', err.message);
  });

  return pool;
}

const pool = createDatabasePool();

module.exports = {
  /**
   * Execute a single parameterized query
   * @param {string} text - SQL statement
   * @param {Array} params - Parameter values
   */
  query: (text, params) => pool.query(text, params),

  /**
   * Acquire a dedicated client from the pool (essential for BEGIN / COMMIT transactions)
   */
  getClient: () => pool.connect(),

  /**
   * Export the pool instance for health checks and shutdown handlers
   */
  pool,
};