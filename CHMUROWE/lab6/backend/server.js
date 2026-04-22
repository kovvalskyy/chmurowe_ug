const express = require("express");
const os = require("os");
const { Pool } = require("pg");
const { createClient } = require("redis");

async function createApp(options = {}) {
  const app = express();
  const instanceId = process.env.INSTANCE_ID || os.hostname();
  const postgres = options.postgres || new Pool({
    host: process.env.POSTGRES_HOST || "postgres",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "postgres",
    database: process.env.POSTGRES_DB || "products"
  });
  const redis = options.redis || createClient({
    url: process.env.REDIS_URL || "redis://redis:6379"
  });
  let requestCount = 0;

  postgres.on("error", () => {});
  redis.on("error", () => {});

  app.use(express.json());
  app.use((req, res, next) => {
    requestCount += 1;
    next();
  });

  if (!options.postgres) {
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
  }

  if (!options.redis) {
    await redis.connect();
  }

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

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    try {
      const result = await postgres.query(
        "INSERT INTO items(name) VALUES ($1) RETURNING id, name",
        [name]
      );

      await redis.del("stats");
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
      status: postgresStatus === "ok" && redisStatus === "ok" ? "ok-dev" : "error",
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
        uptime: process.uptime(),
        serverTime: new Date().toISOString(),
        requestCount
      };

      await redis.set("stats", JSON.stringify(data), {
        EX: 10
      });
      res.set("X-Cache", "MISS");
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Stats unavailable" });
    }
  });

  return app;
}

const port = process.env.PORT || 3000;

if (require.main === module) {
  createApp().then((app) => {
    app.listen(port, () => {
      console.log(`Backend listening on port ${port}`);
    });
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = createApp;
