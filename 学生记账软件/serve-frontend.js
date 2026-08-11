const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'frontend');
const port = 8080;

http.createServer((req, res) => {
  let filePath = path.join(root, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
      res.end(data);
    }
  });
}).listen(port, () => {
  console.log(`Frontend server: http://localhost:${port}`);
});