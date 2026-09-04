"use client";

/**
 * @file providers.tsx
 * @description Client provider stack for the dashboard: TanStack Query cache, reader settings, and the sonner toaster.
 * @architecture Root client wrapper mounted in the dashboard layout; configures query defaults (5-min stale time, no retry on 401).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { useState } from "react";
import { ReaderSettingsProvider } from "./reader-settings-provider";
import { GlobalBootLoader } from "./global-boot-loader";
import "@/components/bones/registry";

/**
 * @desc    Wrap children with the query, reader-settings, and toast providers
 * @param   {{children: React.ReactNode}} props - Child tree
 * @returns {JSX.Element} The provider stack
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: (failureCount, error) => {
              if (
                (error as { response?: { status?: number } }).response
                  ?.status === 401
              )
                return false;
              return failureCount < 1;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ReaderSettingsProvider>
        <GlobalBootLoader />
        {children}
        <Toaster position="bottom-right" richColors />
      </ReaderSettingsProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
