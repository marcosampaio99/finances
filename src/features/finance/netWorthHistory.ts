import { useMutation, useQuery } from "@tanstack/react-query";
import { setDoc } from "firebase/firestore";
import { useEffect } from "react";
import { useUid } from "@/shared/auth/session";
import { useInvalidate } from "@/shared/data/collectionHooks";
import { createUserCollection, userDocRef } from "@/shared/data/userCollection";
import { currentMonth } from "@/shared/lib/date";
import { roundCents } from "@/shared/lib/math";

export interface NetWorthSnapshot {
  id: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}

const COLLECTION = "netWorthSnapshots";
const repository = createUserCollection<NetWorthSnapshot>(COLLECTION);

export function useNetWorthHistory() {
  const uid = useUid();
  return useQuery({
    queryKey: [COLLECTION, uid],
    queryFn: async () => (await repository.list(uid)).sort((a, b) => a.id.localeCompare(b.id)),
  });
}

// Os saldos não têm histórico, por isso guarda-se o valor real de cada mês (id = AAAA-MM) a
// partir do momento em que a funcionalidade existe. Só escreve quando o valor mudou.
export function useRecordNetWorth(
  summary: { assets: number; liabilities: number; netWorth: number },
  ready: boolean,
) {
  const uid = useUid();
  const history = useNetWorthHistory();
  const invalidate = useInvalidate([COLLECTION]);
  const { mutate } = useMutation({
    mutationFn: (snapshot: Omit<NetWorthSnapshot, "id">) =>
      setDoc(userDocRef(uid, COLLECTION, currentMonth()), snapshot),
    onSuccess: invalidate,
    onError: (err) => console.warn("Sem registo do património do mês:", err),
  });

  const assets = roundCents(summary.assets);
  const liabilities = roundCents(summary.liabilities);
  const netWorth = roundCents(summary.netWorth);
  const stored = history.data?.find((s) => s.id === currentMonth());
  const canCompare = ready && history.isSuccess;
  const changed =
    canCompare &&
    (assets !== 0 || liabilities !== 0 || stored !== undefined) &&
    (stored?.assets !== assets || stored?.liabilities !== liabilities);

  useEffect(() => {
    if (changed) mutate({ assets, liabilities, netWorth });
  }, [changed, assets, liabilities, netWorth, mutate]);
}
