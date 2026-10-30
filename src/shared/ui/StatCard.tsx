export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="card">
      <h2>{label}</h2>
      <div className={tone ? `stat ${tone}` : "stat"}>{value}</div>
    </div>
  );
}
