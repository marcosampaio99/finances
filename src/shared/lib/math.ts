export const sum = <T,>(items: T[], value: (item: T) => unknown) =>
  items.reduce((total, item) => total + (Number(value(item)) || 0), 0);

export const roundCents = (n: number) => Math.round(n * 100) / 100;
