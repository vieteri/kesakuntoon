import { describe, it, expect } from "vitest";
import { validateTelegramWebAppData } from "./auth";
import crypto from "node:crypto";

function generateValidInitData(botToken: string, data: Record<string, string>) {
  // 1. Create data check string
  const items = Object.entries(data)
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`);
  
  const dataCheckString = items.join("\n");

  // 2. Create secret key
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // 3. Calculate hash
  const hash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // 4. Return as URL encoded string
  const params = new URLSearchParams(data);
  params.append("hash", hash);
  return params.toString();
}

describe("Telegram Auth Validation", () => {
  const BOT_TOKEN = "12345:mock-token";

  it("should return parsed data for valid signature", async () => {
    const userData = {
      query_id: "AAFj...",
      user: JSON.stringify({ id: 12345, first_name: "Test" }),
      auth_date: Math.floor(Date.now() / 1000).toString(),
    };

    const initData = generateValidInitData(BOT_TOKEN, userData);
    const result = await validateTelegramWebAppData(initData, BOT_TOKEN);

    expect(result).not.toBeNull();
    expect(result?.user?.id).toBe(12345);
  });

  it("should return null for invalid signature", async () => {
    const userData = {
      query_id: "AAFj...",
      user: JSON.stringify({ id: 12345, first_name: "Test" }),
      auth_date: Math.floor(Date.now() / 1000).toString(),
    };
    
    // Generate valid data first
    const initData = generateValidInitData(BOT_TOKEN, userData);
    
    // Tamper with it (e.g. change user ID but keep hash)
    const tamperedData = initData.replace('12345', '99999');

    const result = await validateTelegramWebAppData(tamperedData, BOT_TOKEN);
    expect(result).toBeNull();
  });

  it("should return null for expired data (older than 24h)", async () => {
     const oldDate = Math.floor(Date.now() / 1000) - (25 * 3600); // 25 hours ago
     const userData = {
      query_id: "AAFj...",
      user: JSON.stringify({ id: 12345, first_name: "Test" }),
      auth_date: oldDate.toString(),
    };

    const initData = generateValidInitData(BOT_TOKEN, userData);
    const result = await validateTelegramWebAppData(initData, BOT_TOKEN);
    
    // Should fail due to expiration check
    expect(result).toBeNull();
  });
});
