import { useQueryClient } from "@tanstack/react-query";
import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth } from "@/shared/firebase/client";

interface Session {
  user: User | null;
  loading: boolean;
}

const SessionContext = createContext<Session>({ user: null, loading: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session>({ user: null, loading: true });

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        // Os dados financeiros de uma sessão não ficam em memória depois de sair.
        if (!user) queryClient.clear();
        setSession({ user, loading: false });
      }),
    [queryClient],
  );

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

export function useUid(): string {
  const { user } = useSession();
  if (!user) throw new Error("useUid requer uma sessão iniciada.");
  return user.uid;
}
