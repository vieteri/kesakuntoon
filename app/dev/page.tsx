"use client";
import Home from "../page";

// Set mock Telegram data synchronously so it's available before any child effects run
if (typeof window !== "undefined") {
  const authDate = Math.floor(Date.now() / 1000);
  const user = { id: 123456789, first_name: "DevUser", username: "devuser" };
  const userEncoded = encodeURIComponent(JSON.stringify(user));
  const devInitData = `user=${userEncoded}&auth_date=${authDate}&hash=dev_bypass`;

  (window as any).Telegram = {
    WebApp: {
      platform: "browser-dev",
      version: "7.0",
      initData: devInitData,
      initDataUnsafe: { user },
      ready: () => {},
    },
  };
}

export default function DevPage() {
  return <Home />;
}
