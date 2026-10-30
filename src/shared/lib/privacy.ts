import { useSyncExternalStore } from "react";

const KEY = "financas.hideBalances";

function readStored() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

let hidden = readStored();
const listeners = new Set<() => void>();

export const balancesHidden = () => hidden;

export function setBalancesHidden(next: boolean) {
  hidden = next;
  try {
    localStorage.setItem(KEY, next ? "1" : "0");
  } catch {
    // Sem armazenamento, a preferência vale apenas para esta sessão.
  }
  listeners.forEach((listener) => listener());
}

export function useBalancesHidden() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, balancesHidden);
}
