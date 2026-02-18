// convex/auth.ts
import { GenericActionCtx } from "convex/server";

export async function validateTelegramWebAppData(
  initData: string, 
  botToken: string
): Promise<any | null> {
  // 1. Parse query string
  const params = new URLSearchParams(initData);
  const data: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    data[key] = value;
  }

  // 2. Extract and remove hash
  const hash = data.hash;
  if (!hash) return null;
  delete data.hash;

  // 3. Check auth_date for expiration (24 hours)
  const authDate = parseInt(data.auth_date);
  if (Date.now() / 1000 - authDate > 86400) {
    console.error("Data is too old");
    return null;
  }

  // 4. Create data-check-string
  const dataCheckString = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n");

  // 5. Compute HMAC-SHA256 signature
  // Note: Convex supports standard Web Crypto API
  const encoder = new TextEncoder();
  
  // a. Secret key = HMAC-SHA256("WebAppData", botToken)
  const secretKeyKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const secretKey = await crypto.subtle.sign(
    "HMAC",
    secretKeyKey,
    encoder.encode(botToken)
  );

  // b. Hash = HMAC-SHA256(secretKey, dataCheckString)
  const signingKey = await crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    signingKey,
    encoder.encode(dataCheckString)
  );

  // 6. Compare computed hash with provided hash
  const hexSignature = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (hexSignature === hash) {
    // Return parsed user data
    return {
      ...data,
      user: data.user ? JSON.parse(data.user) : undefined,
    };
  }

  return null;
}
