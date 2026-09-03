"use client";

import { useEffect } from "react";

const RELOAD_KEY = "chunk-load-reload-attempted";

function isChunkLoadFailure(event: ErrorEvent): boolean {
  const message = event.message || "";
  return (
    /Loading chunk\s+\d+\s+failed/i.test(message) ||
    /ChunkLoadError/i.test(message)
  );
}

export function ChunkErrorReload() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (!isChunkLoadFailure(event)) {
        return;
      }

      const hasRetried = sessionStorage.getItem(RELOAD_KEY) === "1";
      if (hasRetried) {
        return;
      }

      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    };

    window.addEventListener("error", onError);

    return () => {
      window.removeEventListener("error", onError);
    };
  }, []);

  useEffect(() => {
    // Clear retry marker after a successful boot so future deploys can recover once.
    sessionStorage.removeItem(RELOAD_KEY);
  }, []);

  return null;
}
