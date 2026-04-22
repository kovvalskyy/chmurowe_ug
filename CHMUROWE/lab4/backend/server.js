const express = require("express");
const os = require("os");

const app = express();
const port = process.env.PORT || 3000;
const instanceId = process.env.INSTANCE_ID || os.hostname();

const items = [
  { id: 1, name: "Laptop" },
  { id: 2, name: "Monitor" }
];

app.use(express.json());

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

app.get("/stats", (req, res) => {
  res.json({
    totalItems: items.length,
    instanceId
  });
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
