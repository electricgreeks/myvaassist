const https = require('https');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).end();

  // Collect raw body chunks — bypasses Next.js bodyParser size limit
  const chunks = [];
  await new Promise((resolve, reject) => {
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', resolve);
    req.on('error', reject);
  });
  const rawBody = Buffer.concat(chunks);

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': rawBody.length,
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'pdfs-2024-09-25'
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
    proxyReq.write(rawBody);
    proxyReq.end();
  });
};
