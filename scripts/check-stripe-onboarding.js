const http = require('http');
const https = require('https');

const apiBase = (process.env.EXPO_PUBLIC_API_URL || process.env.API_URL || 'https://api.acucaradasencomendas.com.br').replace(/\/+$/, '');
const endpoint = `${apiBase}/api/stripe/onboarding-link`;

const payload = {
  userId: process.env.STRIPE_ONBOARDING_USER_ID || 'healthcheck',
  email: process.env.STRIPE_ONBOARDING_EMAIL || 'healthcheck@acucaradasencomendas.com.br',
  userType: process.env.STRIPE_ONBOARDING_USER_TYPE || 'producer',
  refresh_url: process.env.STRIPE_ONBOARDING_REFRESH_URL || 'acucaradas-encomendas://stripe-onboarding-refresh',
  return_url: process.env.STRIPE_ONBOARDING_RETURN_URL || 'acucaradas-encomendas://stripe-onboarding-return'
};

const data = JSON.stringify(payload);
const url = new URL(endpoint);
const client = url.protocol === 'http:' ? http : https;

const request = client.request(
  {
    method: 'POST',
    hostname: url.hostname,
    port: url.port || (url.protocol === 'http:' ? 80 : 443),
    path: url.pathname + url.search,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    },
    timeout: 20000
  },
  (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk.toString('utf8');
    });
    res.on('end', () => {
      process.stdout.write(`STATUS=${res.statusCode}\n`);
      if (body) {
        process.stdout.write(`${body}\n`);
      }
      const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
      process.exit(ok ? 0 : 1);
    });
  }
);

request.on('timeout', () => {
  request.destroy(new Error('timeout'));
});

request.on('error', (error) => {
  process.stdout.write(`ERROR=${error.message}\n`);
  process.exit(1);
});

request.write(data);
request.end();
