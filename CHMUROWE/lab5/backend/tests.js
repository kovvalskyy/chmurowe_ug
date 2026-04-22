const assert = require("node:assert/strict");
const request = require("supertest");
const createApp = require("./server");

async function testHealth() {
  const app = createApp();
  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(typeof response.body.uptime, "number");
}

async function testStats() {
  const app = createApp();

  await request(app).get("/health");
  const response = await request(app).get("/stats");

  assert.equal(response.status, 200);
  assert.equal(response.body.totalItems, 2);
  assert.equal(response.body.requestCount, 2);
  assert.equal(typeof response.body.instanceId, "string");
  assert.equal(typeof response.body.uptime, "number");
  assert.equal(typeof response.body.serverTime, "string");
}

async function run() {
  await testHealth();
  await testStats();
  console.log("Tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
