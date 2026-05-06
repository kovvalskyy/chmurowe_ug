const fs = require("fs");
const { Pool } = require("pg");
const { createClient } = require("redis");

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

async function run() {
  await redis.connect();
  await postgres.query("SELECT 1");
  console.log("Worker connected");

  while (true) {
    const job = await redis.brPop("jobs", 0);

    if (job && job.element) {
      console.log(`Processed ${job.element}`);
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

function readSecret(name, fallback) {
  const path = `/run/secrets/${name}`;

  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch (error) {
    return fallback;
  }
}
