const assert = require("node:assert/strict");
const request = require("supertest");
const createApp = require("./server");

function createPostgres() {
  const items = [
    { id: 1, name: "Laptop" },
    { id: 2, name: "Monitor" }
  ];

  return {
    on() {},
    async query(sql, params = []) {
      if (sql.includes("SELECT 1")) {
        return { rows: [{ "?column?": 1 }] };
      }

      if (sql.includes("SELECT id, name FROM items")) {
        return { rows: items };
      }

      if (sql.includes("SELECT COUNT(*)::int AS count FROM items")) {
        return { rows: [{ count: items.length }] };
      }

      if (sql.includes("INSERT INTO items(name) VALUES ($1) RETURNING id, name")) {
        const item = {
          id: items.length + 1,
          name: params[0]
        };

        items.push(item);
        return { rows: [item] };
      }

      return { rows: [] };
    }
  };
}

function createRedis() {
  const cache = new Map();

  return {
    on() {},
    async connect() {},
    async get(key) {
      return cache.get(key) || null;
    },
    async setEx(key, ttl, value) {
      cache.set(key, value);
    },
    async set(key, value, options) {
      cache.set(key, value);
    },
    async del(key) {
      cache.delete(key);
    },
    async ping() {
      return "PONG";
    }
  };
}

async function testHealth() {
  const app = await createApp({
    postgres: createPostgres(),
    redis: createRedis()
  });
  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(typeof response.body.uptime, "number");
  assert.equal(response.body.postgres, "ok");
  assert.equal(response.body.redis, "ok");
}

async function testStats() {
  const app = await createApp({
    postgres: createPostgres(),
    redis: createRedis()
  });

  await request(app).get("/health");
  const response = await request(app).get("/stats");

  assert.equal(response.status, 200);
  assert.equal(response.body.totalItems, 2);
  assert.equal(response.body.requestCount, 2);
  assert.equal(typeof response.body.instanceId, "string");
  assert.equal(typeof response.body.uptime, "number");
  assert.equal(typeof response.body.serverTime, "string");
  assert.equal(response.headers["x-cache"], "MISS");
}

async function testStatsCache() {
  const app = await createApp({
    postgres: createPostgres(),
    redis: createRedis()
  });

  await request(app).get("/stats");
  const response = await request(app).get("/stats");

  assert.equal(response.status, 200);
  assert.equal(response.headers["x-cache"], "HIT");
}

async function run() {
  await testHealth();
  await testStats();
  await testStatsCache();
  console.log("Tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
