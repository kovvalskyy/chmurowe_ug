const express = require("express");
const os = require("os");

function createApp() {
  const app = express();
  const instanceId = process.env.INSTANCE_ID || os.hostname();
  let requestCount = 0;

  const items = [
    { id: 1, name: "Laptop" },
    { id: 2, name: "Monitor" }
  ];

  app.use(express.json());
  app.use((req, res, next) => {
    requestCount += 1;
    next();
  });

  app.get("/items", (req, res) => {
    res.json({ items });
  });

  app.post("/items", (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const item = {
      id: items.length + 1,
      name
    };

    items.push(item);
    return res.status(201).json(item);
  });

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime()
    });
  });

  app.get("/stats", (req, res) => {
    res.json({
      totalItems: items.length,
      instanceId,
      uptime: process.uptime(),
      serverTime: new Date().toISOString(),
      requestCount
    });
  });

  return app;
}

const port = process.env.PORT || 3000;

if (require.main === module) {
  const app = createApp();

  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

module.exports = createApp;
