import { createElement } from "react";
import { categoryIcon } from "@/features/transactions/model";

export function CategoryIcon({ category, size = 16 }: { category: string; size?: number }) {
  return createElement(categoryIcon(category), { size });
}
