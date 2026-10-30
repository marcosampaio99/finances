import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="card stat">
      <div className="stat-label">
        {Icon && <Icon size={15} />}
        {label}
      </div>
      <div className={tone ? `stat-value ${tone}` : "stat-value"}>{value}</div>
      <div className="stat-hint">{hint}</div>
    </div>
  );
}
