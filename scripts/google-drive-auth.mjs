#!/usr/bin/env node
/**
 * One-time Google Drive authorisation.
 * ────────────────────────────────────
 * Run this once on your own machine to turn a Google OAuth client into the
 * long-lived refresh token the app uses to write guest photos into your Drive.
 *
 *   node scripts/google-drive-auth.mjs
 *
 * Before running, create the OAuth client (5 minutes, one time):
 *   1. https://console.cloud.google.com/  →  create a project (any name).
 *   2. APIs & Services → Library → enable "Google Drive API".
 *   3. APIs & Services → OAuth consent screen → External → fill in the app
 *      name and your own email → Save. Leave it in "Testing" and add your own
 *      Google account under "Test users".
 *   4. APIs & Services → Credentials → Create credentials → OAuth client ID
 *      → Application type "Web application"
 *      → Authorised redirect URI: http://localhost:53682/callback
 *   5. Copy the client ID and client secret into .env.local, then run this.
 *
 * The script opens your browser, you approve once, and it prints the
 * GOOGLE_REFRESH_TOKEN line to paste into .env.local.
 *
 * Note on "Testing" mode: refresh tokens for an app still in Testing expire
 * after 7 days. Before the wedding, click "Publish app" on the OAuth consent
 * screen (it stays unverified, which is fine for a private app used only by
 * you) and re-run this script — the token then lasts indefinitely.
 */

import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const REDIRECT_PORT = 53682;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
// drive.file = access only to files this app creates. It cannot read anything
// else in your Drive, which is the least privilege that still works.
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

loadEnvFiles();

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    '\n  Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.\n' +
      '  Add them to .env.local first (see the header of this file for how to\n' +
      '  create the OAuth client), then run this again.\n'
  );
  process.exit(1);
}

const state = Math.random().toString(36).slice(2);
const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    // access_type=offline + prompt=consent is what makes Google actually hand
    // back a refresh token; without prompt=consent a re-authorisation returns
    // only an access token and this script would appear to "lose" the token.
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

console.log('\n  Opening your browser to authorise Google Drive access…');
console.log(`  If it doesn't open, paste this URL in yourself:\n\n  ${authUrl}\n`);
openBrowser(authUrl);

const code = await waitForCode(state);
const tokens = await exchangeCode(code);

if (!tokens.refresh_token) {
  console.error(
    '\n  Google returned no refresh token. This happens when the account has\n' +
      '  already authorised this client. Revoke it at\n' +
      '  https://myaccount.google.com/permissions and run this again.\n'
  );
  process.exit(1);
}

console.log('\n  ✓ Authorised. Add this line to .env.local:\n');
console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
console.log('  (And add the same value to your Vercel project env vars.)\n');

// ── helpers ───────────────────────────────────────────────────────────────

function loadEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, '');
      if (!process.env[match[1]]) process.env[match[1]] = value;
    }
  }
}

function openBrowser(url) {
  const cmd =
    process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  try {
    spawn(cmd, [url], { shell: process.platform === 'win32', detached: true, stdio: 'ignore' });
  } catch {
    /* the URL is printed above; the user can open it by hand */
  }
}

function waitForCode(expectedState) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404).end();
        return;
      }

      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        error || !code
          ? '<h1>Authorisation failed</h1><p>You can close this tab and try again.</p>'
          : '<h1>Authorised ✓</h1><p>You can close this tab and go back to the terminal.</p>'
      );
      server.close();

      if (error || !code) return reject(new Error(error ?? 'No authorisation code returned'));
      if (returnedState !== expectedState) return reject(new Error('State mismatch — aborting'));
      resolve(code);
    });

    server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${REDIRECT_PORT} is in use. Close whatever is using it and retry.`));
      } else {
        reject(err);
      }
    });

    server.listen(REDIRECT_PORT);
    // Don't leave a listening socket around forever if the user walks away.
    setTimeout(() => {
      server.close();
      reject(new Error('Timed out waiting for authorisation (5 minutes).'));
    }, 5 * 60_000).unref();
  });
}

async function exchangeCode(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${body.error_description ?? body.error}`);
  }
  return body;
}
