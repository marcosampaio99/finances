import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { BrowserRouter } from "react-router";
import { SessionProvider } from "@/shared/auth/session";
import { FeedbackProvider } from "@/shared/ui/feedback";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // Falta de permissão não se resolve a tentar outra vez.
        retry: (failures, error) => failures < 1 && (error as { code?: string }).code !== "permission-denied",
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <FeedbackProvider>
          <BrowserRouter>{children}</BrowserRouter>
        </FeedbackProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
