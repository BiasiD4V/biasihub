import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadHandler(filename) {
  const mod = await import(`./api/${filename}.js`);
  return mod.default;
}

const server = http.createServer((req, res) => {
  // CORS wrappers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, PATCH, PUT, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // polyfills for vercel
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };
  res.json = function(data) {
    this.setHeader('Content-Type', 'application/json');
    this.end(JSON.stringify(data));
  };

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      if (body) {
        try { req.body = JSON.parse(body); } catch(e) { req.body = body; }
      } else {
        req.body = {};
      }

      const pathname = req.url.split('?')[0];

      if (pathname === '/api/membros') {
        const handler = await loadHandler('membros');
        await handler(req, res);
      } else if (pathname === '/api/membros-update') {
        const handler = await loadHandler('membros-update');
        await handler(req, res);
      } else {
        res.status(404).json({ error: 'Not found ' + pathname });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
});

server.listen(3002, () => console.log('Mock Vercel API Server rodando localmente na porta 3002'));
