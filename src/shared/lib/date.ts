const pad = (n: number) => String(n).padStart(2, "0");

export const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Datas locais: logo após a meia-noite, "hoje" tem de ser o dia do utilizador, não o de UTC.
export const today = () => toIsoDate(new Date());

export const currentMonth = () => today().slice(0, 7);

export function parseIsoDate(iso: string) {
  const [y = 1970, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addMonths(month: string, n: number) {
  const [y = 1970, m = 1] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export const monthStart = (month: string) => `${month}-01`;

export function daysBetween(from: string, to: string) {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000);
}

export function eachDay(from: string, to: string) {
  const days: string[] = [];
  for (let d = parseIsoDate(from); toIsoDate(d) <= to; d.setDate(d.getDate() + 1)) {
    days.push(toIsoDate(d));
  }
  return days;
}

export function eachMonth(from: string, to: string) {
  const months: string[] = [];
  for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = addMonths(m, 1)) months.push(m);
  return months;
}
