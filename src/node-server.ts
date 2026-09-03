import http from "node:http";

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        message: "Hello from Node.js",
      }),
    );

    return;
  }

  res.writeHead(404, {
    "Content-Type": "application/json",
  });

  res.end(
    JSON.stringify({
      message: "Not Found",
    }),
  );
});

server.listen(3001, () => {
  console.log("Node.js server is running on port 3001");
});
