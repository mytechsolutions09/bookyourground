const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const queryObject = url.parse(req.url, true).query;
  const targetUrl = queryObject.url;

  if (!targetUrl) {
    res.writeHead(400);
    res.end('Missing "url" query parameter. Example: ?url=https://www.amazon.in/...');
    return;
  }

  console.log(`Proxying request to: ${targetUrl}`);

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  };

  https.get(targetUrl, options, (proxyRes) => {
    let body = '';
    proxyRes.on('data', chunk => body += chunk);
    proxyRes.on('end', () => {
      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'text/html' });
      res.end(body);
    });
  }).on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(500);
    res.end('Failed to proxy request: ' + err.message);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ Local CORS Proxy running at http://localhost:${PORT}`);
  console.log(`Leave this terminal running to fetch Amazon data!\n`);
});
