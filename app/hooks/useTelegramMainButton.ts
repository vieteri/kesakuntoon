"use client";

import { useEffect, useState } from "react";
import { mainButton } from "@telegram-apps/sdk-react";

export function useTelegramMainButton({
  text,
  visible,
  enabled,
  loading,
  onClick,
}: {
  text: string;
  visible: boolean;
  enabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const [mainButtonAvailable, setMainButtonAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isAvailable =
      mainButton.mount.isAvailable() &&
      mainButton.setParams.isAvailable() &&
      mainButton.onClick.isAvailable();

    if (!isAvailable) {
      setMainButtonAvailable(false);
      return;
    }

    try {
      mainButton.mount();
      setMainButtonAvailable(true);
    } catch {
      setMainButtonAvailable(false);
    }

    return () => {
      if (!isAvailable) return;
      try {
        mainButton.unmount();
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    if (!mainButtonAvailable) return;
    if (!mainButton.setParams.isAvailable()) return;

    try {
      mainButton.setParams({
        text,
        isVisible: visible,
        isEnabled: enabled,
        isLoaderVisible: loading,
      });
    } catch {
      // ignore
    }
  }, [enabled, loading, mainButtonAvailable, text, visible]);

  useEffect(() => {
    if (!mainButtonAvailable) return;
    if (!mainButton.onClick.isAvailable()) return;

    const listener = () => onClick();
    let off: VoidFunction | undefined;

    try {
      off = mainButton.onClick(listener);
    } catch {
      return;
    }

    return () => {
      try {
        off?.();
      } catch {
        if (mainButton.offClick.isAvailable()) {
          try {
            mainButton.offClick(listener);
          } catch {
            // ignore
          }
        }
      }
    };
  }, [mainButtonAvailable, onClick]);

  return { mainButtonAvailable };
}
