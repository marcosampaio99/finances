import { parseIsoDate } from "@/shared/lib/date";
import { balancesHidden } from "@/shared/lib/privacy";

const currency = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const compactCurrency = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});
const percent = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 });
const quantityFormat = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 8 });
const fullDate = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", year: "numeric" });
const dayMonth = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" });
const monthYear = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" });
const shortMonth = new Intl.DateTimeFormat("pt-PT", { month: "short" });

const MASK = "••••";

// Com os saldos ocultos, todos os valores que revelam montantes passam por aqui.
export const eur = (n: number) => (balancesHidden() ? `${MASK} €` : currency.format(n || 0));
export const eurCompact = (n: number) => (balancesHidden() ? MASK : compactCurrency.format(n || 0));
export const signedEur = (n: number) => (balancesHidden() ? eur(n) : (n >= 0 ? "+" : "") + eur(n));
export const pct = (n: number) => `${percent.format(n)}%`;
export const signedPct = (n: number) => (n >= 0 ? "+" : "") + pct(n);
export const quantity = (n: number) => (balancesHidden() ? MASK : quantityFormat.format(n));
export const unitPrice = (n: number, currencyCode: string) =>
  balancesHidden() ? MASK : `${n.toLocaleString("pt-PT", { maximumFractionDigits: 4 })} ${currencyCode}`;

export const dateLabel = (iso: string) => (iso ? fullDate.format(parseIsoDate(iso)) : "—");
export const dayLabel = (iso: string) => dayMonth.format(parseIsoDate(iso));
export const monthLabel = (month: string) => monthYear.format(parseIsoDate(`${month}-01`));
export const monthShortLabel = (month: string) =>
  `${shortMonth.format(parseIsoDate(`${month}-01`)).replace(".", "")} ${month.slice(2, 4)}`;
