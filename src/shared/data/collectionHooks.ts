import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUid } from "@/shared/auth/session";
import type { CollectionRepository, Input } from "@/shared/data/userCollection";

// Gera os hooks de leitura/escrita de uma coleção. `alsoInvalidates` lista as
// coleções cujos dados mudam como efeito secundário de uma escrita nesta.
export function createCollectionHooks<T extends { id: string }>(
  name: string,
  repository: CollectionRepository<T>,
  options: { alsoInvalidates?: string[] } = {},
) {
  function useInvalidate() {
    const queryClient = useQueryClient();
    const uid = useUid();
    return () =>
      Promise.all(
        [name, ...(options.alsoInvalidates ?? [])].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key, uid] }),
        ),
      );
  }

  return {
    useList() {
      const uid = useUid();
      return useQuery({ queryKey: [name, uid], queryFn: () => repository.list(uid) });
    },
    useAdd() {
      const uid = useUid();
      const invalidate = useInvalidate();
      return useMutation({
        mutationFn: (data: Input<T>) => repository.add(uid, data),
        onSuccess: invalidate,
      });
    },
    useRemove() {
      const uid = useUid();
      const invalidate = useInvalidate();
      return useMutation({
        mutationFn: (id: string) => repository.remove(uid, id),
        onSuccess: invalidate,
      });
    },
  };
}
