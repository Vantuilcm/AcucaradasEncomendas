'use strict';

/**
 * ASC Build History — isolated GET-only client (R62).
 * No build / submit / upload / deploy. Secrets never logged.
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const DEFAULT_APP_ID = '6756029389';
const DEFAULT_BUNDLE_ID = 'com.acucaradas.encomendas';
const ASC_HOST = 'api.appstoreconnect.apple.com';
const ASC_AUD = 'appstoreconnect-v1';
const JWT_TTL_SEC = 20 * 60;
const MAX_PAGES = 100;
const REQUEST_TIMEOUT_MS = 30000;

class AscReadError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = 'AscReadError';
    this.code = code;
    this.detail = detail || null;
    this.reliableHighest = false;
  }
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function resolvePrivateKeyPem(env) {
  const raw = env.EXPO_ASC_PRIVATE_KEY;
  const b64 = env.EXPO_ASC_PRIVATE_KEY_BASE64;
  if (raw != null && String(raw).trim() !== '') {
    const pem = String(raw).includes('\\n') ? String(raw).replace(/\\n/g, '\n') : String(raw);
    if (!pem.includes('BEGIN PRIVATE KEY') && !pem.includes('BEGIN EC PRIVATE KEY')) {
      throw new AscReadError('CREDENTIAL_MALFORMED', 'EXPO_ASC_PRIVATE_KEY is not a PEM private key');
    }
    return pem;
  }
  if (b64 != null && String(b64).trim() !== '') {
    let decoded;
    try {
      decoded = Buffer.from(String(b64).trim(), 'base64').toString('utf8');
    } catch (_) {
      throw new AscReadError('CREDENTIAL_MALFORMED', 'EXPO_ASC_PRIVATE_KEY_BASE64 is not valid base64');
    }
    if (!decoded.includes('BEGIN PRIVATE KEY') && !decoded.includes('BEGIN EC PRIVATE KEY')) {
      throw new AscReadError('CREDENTIAL_MALFORMED', 'Decoded EXPO_ASC_PRIVATE_KEY_BASE64 is not a PEM private key');
    }
    return decoded;
  }
  throw new AscReadError('CREDENTIAL_MISSING', 'ASC private key missing (EXPO_ASC_PRIVATE_KEY or EXPO_ASC_PRIVATE_KEY_BASE64)');
}

function requireCreds(env) {
  const keyId = env.EXPO_ASC_KEY_ID;
  const issuerId = env.EXPO_ASC_ISSUER_ID;
  if (keyId == null || String(keyId).trim() === '') {
    throw new AscReadError('CREDENTIAL_MISSING', 'EXPO_ASC_KEY_ID missing');
  }
  if (issuerId == null || String(issuerId).trim() === '') {
    throw new AscReadError('CREDENTIAL_MISSING', 'EXPO_ASC_ISSUER_ID missing');
  }
  const pem = resolvePrivateKeyPem(env);
  return { keyId: String(keyId).trim(), issuerId: String(issuerId).trim(), pem };
}

function createAscJwt({ keyId, issuerId, pem }, nowSec) {
  let keyObject;
  try {
    keyObject = crypto.createPrivateKey(pem);
  } catch (_) {
    throw new AscReadError('CREDENTIAL_MALFORMED', 'Unable to parse ASC private key');
  }
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = {
    iss: issuerId,
    iat: nowSec,
    exp: nowSec + JWT_TTL_SEC,
    aud: ASC_AUD,
  };
  const encoded =
    b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(payload));
  let signature;
  try {
    signature = crypto.sign('sha256', Buffer.from(encoded), {
      key: keyObject,
      dsaEncoding: 'ieee-p1363',
    });
  } catch (_) {
    throw new AscReadError('JWT_SIGN_FAILED', 'Failed to sign ASC JWT');
  }
  return encoded + '.' + b64url(signature);
}

function assertSafeAscUrl(urlString, { allowBuildsQuery }) {
  let u;
  try {
    u = new URL(urlString);
  } catch (_) {
    throw new AscReadError('UNSAFE_URL', 'Malformed ASC URL');
  }
  if (u.protocol !== 'https:') {
    throw new AscReadError('UNSAFE_URL', 'Only HTTPS allowed for ASC');
  }
  if (u.username || u.password) {
    throw new AscReadError('UNSAFE_URL', 'ASC URL must not embed credentials');
  }
  if (u.hostname !== ASC_HOST) {
    throw new AscReadError('UNSAFE_URL', 'ASC host not allowlisted');
  }
  const path = u.pathname;
  const appPathOk = /^\/v1\/apps\/[0-9]+$/.test(path);
  const buildsPathOk = path === '/v1/builds';
  if (appPathOk) return u;
  if (buildsPathOk && allowBuildsQuery) return u;
  throw new AscReadError('ENDPOINT_NOT_ALLOWED', 'ASC path not allowlisted: ' + path);
}

function parseBuildNumber(raw) {
  if (raw == null) {
    throw new AscReadError('INVALID_BUILD_NUMBER', 'Build number missing');
  }
  const s = String(raw);
  if (!/^[0-9]+$/.test(s)) {
    throw new AscReadError('INVALID_BUILD_NUMBER', 'Build number not a non-negative decimal integer');
  }
  // Reject leading zeros except "0" itself as invalid for CFBundleVersion max calc context
  if (s.length > 1 && s.startsWith('0')) {
    throw new AscReadError('INVALID_BUILD_NUMBER', 'Build number has invalid leading zero');
  }
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n < 1) {
    throw new AscReadError('INVALID_BUILD_NUMBER', 'Build number outside safe positive integer range');
  }
  return { raw: s, numeric: n };
}

function defaultFetch(urlString, { method, headers, timeoutMs, redirect }) {
  if (method !== 'GET') {
    return Promise.reject(new AscReadError('METHOD_NOT_ALLOWED', 'Only GET is permitted'));
  }
  const u = new URL(urlString);
  const lib = u.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: 'GET',
        headers,
        timeout: timeoutMs || REQUEST_TIMEOUT_MS,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body,
            url: urlString,
          });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new AscReadError('TIMEOUT', 'ASC request timed out'));
    });
    req.on('error', (err) => {
      const msg = err && err.message ? err.message : String(err);
      if (/certificate|SSL|TLS/i.test(msg)) {
        reject(new AscReadError('TLS_FAILURE', 'ASC TLS failure'));
      } else {
        reject(new AscReadError('NETWORK_FAILURE', 'ASC network failure'));
      }
    });
    // Never follow redirects automatically — inspect status in caller.
    void redirect;
    req.end();
  });
}

function mapHttpError(status) {
  if (status === 401) return new AscReadError('HTTP_401', 'ASC authentication failed (401)');
  if (status === 403) return new AscReadError('HTTP_403', 'ASC permission denied (403)');
  if (status === 429) return new AscReadError('HTTP_429', 'ASC rate limited (429)');
  if (status >= 500 && status <= 599) return new AscReadError('HTTP_5XX', 'ASC server error (' + status + ')');
  return new AscReadError('HTTP_ERROR', 'ASC unexpected HTTP status ' + status);
}

async function ascGetJson(urlString, token, deps, allowBuildsQuery) {
  assertSafeAscUrl(urlString, { allowBuildsQuery });
  const fetchImpl = deps.fetchImpl || defaultFetch;
  let res;
  try {
    res = await fetchImpl(urlString, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json',
      },
      timeoutMs: deps.timeoutMs || REQUEST_TIMEOUT_MS,
      redirect: 'manual',
    });
  } catch (e) {
    if (e instanceof AscReadError) throw e;
    throw new AscReadError('NETWORK_FAILURE', 'ASC request failed');
  }
  if (!res || typeof res.status !== 'number') {
    throw new AscReadError('MALFORMED_RESPONSE', 'ASC response missing status');
  }
  if (res.status >= 300 && res.status < 400) {
    throw new AscReadError('UNSAFE_REDIRECT', 'ASC redirects are not followed');
  }
  if (res.status !== 200) {
    throw mapHttpError(res.status);
  }
  let json;
  try {
    json = JSON.parse(res.body || '');
  } catch (_) {
    throw new AscReadError('INVALID_JSON', 'ASC response is not valid JSON');
  }
  return json;
}

function extractBundleId(appJson) {
  if (!appJson || typeof appJson !== 'object' || !appJson.data || typeof appJson.data !== 'object') {
    throw new AscReadError('MALFORMED_RESPONSE', 'ASC app response missing data');
  }
  const attrs = appJson.data.attributes;
  if (!attrs || typeof attrs !== 'object') {
    throw new AscReadError('MALFORMED_RESPONSE', 'ASC app response missing attributes');
  }
  const bundleId = attrs.bundleId;
  if (bundleId == null || String(bundleId).trim() === '') {
    throw new AscReadError('MALFORMED_RESPONSE', 'ASC app response missing bundleId');
  }
  return String(bundleId);
}

function extractBuildsPage(pageJson) {
  if (!pageJson || typeof pageJson !== 'object') {
    throw new AscReadError('MALFORMED_RESPONSE', 'ASC builds response not an object');
  }
  if (!Object.prototype.hasOwnProperty.call(pageJson, 'data')) {
    throw new AscReadError('MALFORMED_RESPONSE', 'ASC builds response missing data');
  }
  if (!Array.isArray(pageJson.data)) {
    throw new AscReadError('MALFORMED_RESPONSE', 'ASC builds data is not an array');
  }
  const numbers = [];
  for (const item of pageJson.data) {
    if (!item || typeof item !== 'object') {
      throw new AscReadError('MALFORMED_RESPONSE', 'ASC build item invalid');
    }
    const attrs = item.attributes;
    if (!attrs || typeof attrs !== 'object') {
      throw new AscReadError('MALFORMED_RESPONSE', 'ASC build item missing attributes');
    }
    // attributes.version is CFBundleVersion in ASC Builds API
    numbers.push(parseBuildNumber(attrs.version));
  }
  const next =
    pageJson.links && typeof pageJson.links === 'object' && pageJson.links.next
      ? String(pageJson.links.next)
      : null;
  return { numbers, next };
}

async function runAscBuildHistoryReadOnly(options) {
  const deps = options || {};
  const env = deps.env || process.env;
  const expectedAppId = String(env.AE_ASC_EXPECTED_APP_ID || DEFAULT_APP_ID);
  const expectedBundleId = String(env.AE_ASC_EXPECTED_BUNDLE_ID || DEFAULT_BUNDLE_ID);
  const maxPages = Number(env.AE_ASC_MAX_PAGES || MAX_PAGES);
  const nowSec = typeof deps.nowSec === 'number' ? deps.nowSec : Math.floor(Date.now() / 1000);

  if (!/^[0-9]+$/.test(expectedAppId)) {
    throw new AscReadError('CONFIG_INVALID', 'AE_ASC_EXPECTED_APP_ID invalid');
  }

  const creds = requireCreds(env);
  const token = createAscJwt(creds, nowSec);

  const appUrl = 'https://' + ASC_HOST + '/v1/apps/' + expectedAppId;
  const appJson = await ascGetJson(appUrl, token, deps, false);
  if (appJson.data && appJson.data.id && String(appJson.data.id) !== expectedAppId) {
    throw new AscReadError('APP_ID_MISMATCH', 'ASC app id diverges from expected');
  }
  const bundleId = extractBundleId(appJson);
  if (bundleId !== expectedBundleId) {
    throw new AscReadError('BUNDLE_ID_MISMATCH', 'ASC bundleId diverges from expected');
  }

  let nextUrl =
    'https://' +
    ASC_HOST +
    '/v1/builds?filter[app]=' +
    encodeURIComponent(expectedAppId) +
    '&limit=200&sort=-version';
  const seenUrls = new Set();
  const all = [];
  let pages = 0;

  while (nextUrl) {
    if (seenUrls.has(nextUrl)) {
      throw new AscReadError('PAGINATION_LOOP', 'ASC pagination URL repeated');
    }
    seenUrls.add(nextUrl);
    pages += 1;
    if (pages > maxPages) {
      throw new AscReadError('PAGINATION_LIMIT', 'ASC pagination exceeded max pages');
    }
    const pageJson = await ascGetJson(nextUrl, token, deps, true);
    const { numbers, next } = extractBuildsPage(pageJson);
    for (const n of numbers) all.push(n);
    if (next) {
      assertSafeAscUrl(next, { allowBuildsQuery: true });
      nextUrl = next;
    } else {
      nextUrl = null;
    }
  }

  const evidence = {
    ok: true,
    reliableHighest: true,
    appId: expectedAppId,
    bundleId: expectedBundleId,
    pageCount: pages,
    buildCount: all.length,
    emptyHistory: all.length === 0,
    highestBuildNumber: null,
    highestBuildNumberRaw: null,
    // Never include token/key material
  };

  if (all.length > 0) {
    let max = all[0];
    for (let i = 1; i < all.length; i += 1) {
      if (all[i].numeric > max.numeric) max = all[i];
    }
    evidence.highestBuildNumber = max.numeric;
    evidence.highestBuildNumberRaw = max.raw;
  }

  return evidence;
}

async function main() {
  try {
    const evidence = await runAscBuildHistoryReadOnly({ env: process.env });
    // Structured evidence only — no secrets
    process.stdout.write(JSON.stringify(evidence, null, 2) + '\n');
    process.exitCode = 0;
  } catch (e) {
    const code = e && e.code ? e.code : 'UNEXPECTED';
    const message = e && e.message ? e.message : String(e);
    const fail = {
      ok: false,
      reliableHighest: false,
      errorCode: code,
      errorMessage: message,
      highestBuildNumber: null,
    };
    process.stderr.write(JSON.stringify(fail) + '\n');
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  AscReadError,
  runAscBuildHistoryReadOnly,
  createAscJwt,
  requireCreds,
  parseBuildNumber,
  assertSafeAscUrl,
  DEFAULT_APP_ID,
  DEFAULT_BUNDLE_ID,
  ASC_HOST,
};
