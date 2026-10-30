import { useMutation } from "@tanstack/react-query";
import type { OperationInput, Position, PositionInput } from "@/features/investments/model";
import {
  deletePosition,
  operationsRepository,
  positionsRepository,
  recordOperation,
  recordValuation,
  savePosition,
  valuationsRepository,
} from "@/features/investments/repository";
import { useUid } from "@/shared/auth/session";
import { createCollectionHooks, useInvalidate } from "@/shared/data/collectionHooks";

export const positionHooks = createCollectionHooks("investments", positionsRepository);
export const operationHooks = createCollectionHooks("investmentOperations", operationsRepository);
export const valuationHooks = createCollectionHooks("investmentValuations", valuationsRepository);

function usePortfolioMutation<V>(run: (uid: string, variables: V) => Promise<void>) {
  const uid = useUid();
  const invalidate = useInvalidate(["investments", "investmentOperations", "investmentValuations"]);
  return useMutation({ mutationFn: (variables: V) => run(uid, variables), onSuccess: invalidate });
}

export const useSavePosition = () =>
  usePortfolioMutation(
    (uid, v: { previous: Position | null; data: PositionInput; valuationDate: string }) =>
      savePosition(uid, v.previous, v.data, v.valuationDate),
  );

export const useRecordValuation = () =>
  usePortfolioMutation(
    (uid, v: { position: Position; date: string; value: number; latestKnownDate: string | null }) =>
      recordValuation(uid, v.position, v.date, v.value, v.latestKnownDate),
  );

export const useRecordOperation = () =>
  usePortfolioMutation((uid, v: { positionId: string; op: OperationInput }) =>
    recordOperation(uid, v.positionId, v.op),
  );

export const useDeletePosition = () => usePortfolioMutation(deletePosition);
