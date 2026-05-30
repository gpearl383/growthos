#!/usr/bin/env node

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${name}: ${message}`);
    return false;
  }
}

async function main() {
  console.log(`Running smoke checks against ${baseUrl}\n`);

  const results = [];

  results.push(
    await check("GET / returns 200", async () => {
      const response = await fetch(`${baseUrl}/`);
      if (!response.ok) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
    }),
  );

  results.push(
    await check("GET /get-started returns 200", async () => {
      const response = await fetch(`${baseUrl}/get-started`);
      if (!response.ok) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
    }),
  );

  results.push(
    await check("Meta webhook verification responds with challenge", async () => {
      const url = new URL(`${baseUrl}/api/webhooks/meta`);
      url.searchParams.set("hub.mode", "subscribe");
      url.searchParams.set("hub.verify_token", "growthos-dev-verify");
      url.searchParams.set("hub.challenge", "smoke-test-challenge");

      const response = await fetch(url);
      const body = await response.text();

      if (!response.ok || body !== "smoke-test-challenge") {
        throw new Error(`Expected challenge echo, got ${response.status} ${body}`);
      }
    }),
  );

  results.push(
    await check("POST /api/leads without DB returns 503 or accepts JSON", async () => {
      const response = await fetch(`${baseUrl}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug: "demo",
          pageSlug: "offer",
          name: "Smoke Test",
          email: "test@example.com",
        }),
      });

      if (![200, 404, 503].includes(response.status)) {
        throw new Error(`Unexpected status ${response.status}`);
      }
    }),
  );

  results.push(
    await check("POST /api/ai/chat returns a response", async () => {
      const response = await fetch(`${baseUrl}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "What should I post this week?" }],
        }),
      });

      if (![200, 403, 503].includes(response.status)) {
        throw new Error(`Unexpected status ${response.status}`);
      }

      const text = await response.text();
      if (response.ok && text.trim().length === 0) {
        throw new Error("Expected non-empty chat response");
      }
    }),
  );

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log(`\n${passed}/${total} smoke checks passed`);

  if (passed !== total) {
    process.exit(1);
  }
}

main();
