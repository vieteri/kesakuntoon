"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
      console.error("CRITICAL: NEXT_PUBLIC_CONVEX_URL is missing!");
      return (
          <div className="flex items-center justify-center min-h-screen p-4 text-center">
              <div>
                  <h1 className="text-xl font-bold text-red-600">Configuration Error</h1>
                  <p className="mt-2">Missing Convex URL. Please check your environment variables.</p>
              </div>
          </div>
      );
  }
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
