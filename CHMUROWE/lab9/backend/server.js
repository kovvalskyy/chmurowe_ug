const express = require("express");
const fs = require("fs");
const os = require("os");
const { Pool } = require("pg");
const { createClient } = require("redis");

const app = express();
const instanceId = process.env.INSTANCE_ID || os.hostname();
const appConfigPath = process.env.APP_CONFIG_PATH || "/app/app.config.json";
const appConfig = readJsonFile(appConfigPath, {
  requestTimeoutMs: 5000,
  maxItemNameLength: 100,
  statsCacheTtlSeconds: 10,
  instances: {}
});
const postgres = new Pool({
  host: process.env.POSTGRES_HOST || "postgres",
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: readSecret("db_user", "postgres"),
  password: readSecret("db_password", "postgres"),
  database: process.env.POSTGRES_DB || "products"
});
const redis = createClient({
  url: process.env.REDIS_URL || "redis://redis:6379"
});
const port = process.env.BACKEND_PORT || process.env.PORT || 3000;
let requestCount = 0;

postgres.on("error", () => {});
redis.on("error", () => {});

app.use(express.json());
app.use((req, res, next) => {
  req.setTimeout(Number(appConfig.requestTimeoutMs || 5000));
  next();
});
app.use((req, res, next) => {
  requestCount += 1;
  res.set("X-Instance-Id", instanceId);
  next();
});

app.get("/items", async (req, res) => {
  try {
    const result = await postgres.query("SELECT id, name FROM items ORDER BY id");
    res.json({ items: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/items", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const maxItemNameLength = Number(appConfig.maxItemNameLength || 100);

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  if (name.length > maxItemNameLength) {
    return res.status(400).json({ error: `Name must be ${maxItemNameLength} characters or less` });
  }

  try {
    const result = await postgres.query(
      "INSERT INTO items(name) VALUES ($1) RETURNING id, name",
      [name]
    );

    await redis.del("stats");
    await redis.lPush("jobs", JSON.stringify({
      type: "item_created",
      item: result.rows[0]
    }));
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Database error" });
  }
});

app.get("/health", async (req, res) => {
  let postgresStatus = "ok";
  let redisStatus = "ok";

  try {
    await postgres.query("SELECT 1");
  } catch (error) {
    postgresStatus = "error";
  }

  try {
    await redis.ping();
  } catch (error) {
    redisStatus = "error";
  }

  res.status(postgresStatus === "ok" && redisStatus === "ok" ? 200 : 503).json({
    status: postgresStatus === "ok" && redisStatus === "ok" ? "ok" : "error",
    uptime: process.uptime(),
    postgres: postgresStatus,
    redis: redisStatus
  });
});

app.get("/stats", async (req, res) => {
  try {
    const cached = await redis.get("stats");

    if (cached) {
      res.set("X-Cache", "HIT");
      return res.json(JSON.parse(cached));
    }

    const result = await postgres.query("SELECT COUNT(*)::int AS count FROM items");
    const data = {
      totalItems: result.rows[0].count,
      instanceId,
      instanceName: appConfig.instances?.[instanceId]?.displayName || instanceId,
      uptime: process.uptime(),
      serverTime: new Date().toISOString(),
      requestCount
    };

    await redis.set("stats", JSON.stringify(data), {
      EX: Number(appConfig.statsCacheTtlSeconds || 10)
    });
    res.set("X-Cache", "MISS");
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Stats unavailable" });
  }
});

async function start() {
  await initializeDatabase();

  await redis.connect();

  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function initializeDatabase() {
  await postgres.query("SELECT pg_advisory_lock(8108)");

  try {
    await postgres.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);

    const result = await postgres.query("SELECT COUNT(*)::int AS count FROM items");

    if (result.rows[0].count === 0) {
      await postgres.query(
        "INSERT INTO items(name) VALUES ($1), ($2)",
        ["Laptop", "Monitor"]
      );
    }
  } finally {
    await postgres.query("SELECT pg_advisory_unlock(8108)");
  }
}

function readSecret(name, fallback) {
  const path = `/run/secrets/${name}`;

  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch (error) {
    return fallback;
  }
}

function readJsonFile(path, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (error) {
    return fallback;
  }
}
