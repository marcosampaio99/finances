import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUid } from "@/shared/auth/session";
import type { CollectionRepository, Input } from "@/shared/data/userCollection";

export function useInvalidate(names: string[]) {
  const queryClient = useQueryClient();
  const uid = useUid();
  return () =>
    Promise.all(names.map((key) => queryClient.invalidateQueries({ queryKey: [key, uid] })));
}

// Gera os hooks de leitura/escrita de uma coleção.
export function createCollectionHooks<T extends { id: string }>(
  name: string,
  repository: CollectionRepository<T>,
) {
  return {
    useList() {
      const uid = useUid();
      return useQuery({ queryKey: [name, uid], queryFn: () => repository.list(uid) });
    },
    useAdd() {
      const uid = useUid();
      const invalidate = useInvalidate([name]);
      return useMutation({
        mutationFn: (data: Input<T>) => repository.add(uid, data),
        onSuccess: invalidate,
      });
    },
    useUpdate() {
      const uid = useUid();
      const invalidate = useInvalidate([name]);
      return useMutation({
        mutationFn: ({ id, patch }: { id: string; patch: Partial<Input<T>> }) =>
          repository.update(uid, id, patch),
        onSuccess: invalidate,
      });
    },
    useRemove() {
      const uid = useUid();
      const invalidate = useInvalidate([name]);
      return useMutation({
        mutationFn: (id: string) => repository.remove(uid, id),
        onSuccess: invalidate,
      });
    },
  };
}
