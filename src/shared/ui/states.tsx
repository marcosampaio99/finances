import { CircleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function Skeleton({ width, height = 14 }: { width?: number | string; height?: number }) {
  return <div className="skel" style={{ width: width ?? "100%", height }} />;
}

export function PageSkeleton({ stats = 3 }: { stats?: number }) {
  return (
    <div className="page" aria-busy="true" aria-label="A carregar">
      <div className={stats === 4 ? "stats stats-4" : "stats"}>
        {Array.from({ length: stats }, (_, i) => (
          <div className="card stat" key={i}>
            <Skeleton width={90} height={12} />
            <div style={{ height: 14 }} />
            <Skeleton width="65%" height={24} />
          </div>
        ))}
      </div>
      <div className="card">
        <Skeleton width={140} height={13} />
        <div style={{ height: 18 }} />
        <Skeleton height={220} />
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "empty empty-compact" : "empty"}>
      <div className="empty-icon">
        <Icon size={20} />
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="card" role="alert">
      <EmptyState
        icon={CircleAlert}
        title="Não foi possível carregar os dados"
        text="Verifica a ligação e tenta novamente. Os teus dados não foram alterados."
        action={
          <button className="btn" onClick={onRetry}>
            Tentar novamente
          </button>
        }
      />
    </div>
  );
}
