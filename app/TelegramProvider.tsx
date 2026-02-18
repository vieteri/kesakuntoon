"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import { init, miniApp, themeParams } from "@telegram-apps/sdk-react";

export function TelegramProvider({ children }: PropsWithChildren) {
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      // Initialize the SDK
      init();
      
      // Attempt to mount mini app if available
      if (miniApp.mount.isAvailable()) {
          miniApp.mount();
      }
      
      // Attempt to mount theme params if available
      if (themeParams.mount.isAvailable()) {
          themeParams.mount();
          themeParams.bindCssVars(); // Bind CSS vars for Tailwind
      }

      setIsClient(true);
    } catch (e) {
      // If we are not in Telegram, init() might fail or throw
      // We can log it but allow the app to run (maybe in a degraded mode)
      console.error("Telegram SDK init failed (likely not in Telegram):", e);
      setError(e as Error);
      setIsClient(true); // Still render children
    }
  }, []);

  if (!isClient) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // If we want to block non-Telegram users, we could return an error screen here
  // For now, we render children even if error (dev mode)
  
  return <>{children}</>;
}
