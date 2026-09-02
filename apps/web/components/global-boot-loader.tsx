"use client";

import { useEffect, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { NexusLoader } from "@/components/ui/nexus-loader";

export function GlobalBootLoader() {
  const isFetching = useIsFetching();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [isBooted, setIsBooted] = useState(false);

  useEffect(() => {
    // Ensure the loader stays for at least 2 seconds (or more if queries are still fetching)
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // We consider the app "booted" when 2 seconds have passed AND no initial queries are actively fetching.
    // (If minTimeElapsed is true, it means at least 2000ms have passed.
    // By that time, React Query has already started its fetches. Once they drop to 0, we're done.)
    if (!isBooted && minTimeElapsed && isFetching === 0) {
      setIsBooted(true);
    }
  }, [minTimeElapsed, isFetching, isBooted]);

  if (isBooted) {
    return null;
  }

  return <NexusLoader />;
}
