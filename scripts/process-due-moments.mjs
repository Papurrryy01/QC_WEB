#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [rawKey, ...rawValue] = trimmed.split("=");
    const key = rawKey.trim();
    if (!key || process.env[key]) continue;

    const value = rawValue
      .join("=")
      .trim()
      .replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  }
}

loadLocalEnv();

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://127.0.0.1:3000";

const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error("Missing CRON_SECRET.");
  process.exit(1);
}

const endpoint = `${siteUrl.replace(/\/$/, "")}/api/jobs/deliver-moments`;

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    authorization: `Bearer ${secret}`,
  },
});

const text = await response.text();

if (!response.ok) {
  console.error(`Processing failed (${response.status})`);
  console.error(text);
  process.exit(1);
}

console.log(text);
