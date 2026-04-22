const http = require("http");

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({
      status: "ok",
      service: "backend-api"
    }));
  }

  if (req.method === "GET" && req.url === "/items") {
    res.writeHead(200);
    return res.end(JSON.stringify({
      items: ["item1", "item2", "item3"]
    }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({
    error: "Not found"
  }));
});

server.listen(3000, () => {
  console.log("Server listening on port 3000");
});