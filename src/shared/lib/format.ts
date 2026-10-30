const currency = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export const eur = (n: number) => currency.format(n || 0);

export const signedEur = (n: number) => (n >= 0 ? "+" : "") + eur(n);
