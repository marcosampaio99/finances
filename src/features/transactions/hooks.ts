import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Transaction, TransactionInput, TransactionKind } from "@/features/transactions/model";
import { saveTransaction, transactionLists } from "@/features/transactions/repository";
import { useUid } from "@/shared/auth/session";
import { useInvalidate } from "@/shared/data/collectionHooks";

function useKindList(kind: TransactionKind, name: string) {
  const uid = useUid();
  return useQuery({ queryKey: [name, uid], queryFn: () => transactionLists[kind].list(uid) });
}

export function useTransactions() {
  const expenses = useKindList("expense", "expenses");
  const income = useKindList("income", "income");
  const transfers = useKindList("transfer", "transfers");

  const data = useMemo(() => {
    const all = [...(expenses.data ?? []), ...(income.data ?? []), ...(transfers.data ?? [])];
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses.data, income.data, transfers.data]);

  return {
    data,
    isLoading: expenses.isLoading || income.isLoading || transfers.isLoading,
    // `transfers` é uma coleção nova: se regras antigas a bloquearem, o resto continua a funcionar.
    isError: expenses.isError || income.isError,
    transfersBlocked: transfers.isError,
    refetch: () => Promise.all([expenses.refetch(), income.refetch(), transfers.refetch()]),
  };
}

export function useSaveTransaction() {
  const uid = useUid();
  const invalidate = useInvalidate(["expenses", "income", "transfers", "accounts"]);
  return useMutation({
    mutationFn: ({
      previous,
      next,
    }: {
      previous: Pick<Transaction, "kind" | "id"> | null;
      next: TransactionInput | null;
    }) => saveTransaction(uid, previous, next),
    onSuccess: invalidate,
  });
}
