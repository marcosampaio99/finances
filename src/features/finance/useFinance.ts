import { accountHooks } from "@/features/accounts/accounts";
import { positionHooks } from "@/features/investments/hooks";
import { useTransactions } from "@/features/transactions/hooks";

// Dados base que a maioria das páginas precisa, com estados de carga e erro agregados.
export function useFinance() {
  const accounts = accountHooks.useList();
  const positions = positionHooks.useList();
  const transactions = useTransactions();

  return {
    accounts: accounts.data ?? [],
    positions: positions.data ?? [],
    transactions: transactions.data,
    isLoading: accounts.isLoading || positions.isLoading || transactions.isLoading,
    isError: accounts.isError || positions.isError || transactions.isError,
    refetch: () => {
      accounts.refetch();
      positions.refetch();
      transactions.refetch();
    },
  };
}
