const https = require('https');

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).end();

  const chunks = [];
  await new Promise((resolve, reject) => {
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', resolve);
    req.on('error', reject);
  });

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch(e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  body.model = 'claude-sonnet-4-20250514';
  if (!body.max_tokens) body.max_tokens = 4000;

  const betas = ['pdfs-2024-09-25'];
  if (Array.isArray(body.betas)) {
    body.betas.forEach(b => { if (!betas.includes(b)) betas.push(b); });
  }
  delete body.betas;

  const payload = Buffer.from(JSON.stringify(body));

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length,
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': betas.join(',')
    }
  };

  return new Promise((resolve) => {
    const proxyReq = https.request(options, (proxyRes) => {
      res.status(proxyRes.statusCode);
      res.setHeader('Content-Type', 'application/json');
      proxyRes.pipe(res);
      proxyRes.on('end', resolve);
    });
    proxyReq.on('error', (err) => {
      res.status(500).json({ error: err.message });
      resolve();
    });
    proxyReq.write(payload);
    proxyReq.end();
  });
}

handler.config = {
  api: {
    bodyParser: false,
    responseLimit: false
  }
};

module.exports = handler;
