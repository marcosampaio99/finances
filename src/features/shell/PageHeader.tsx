import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useTransactionEditor } from "@/features/transactions/TransactionEditor";
import { useSession } from "@/shared/auth/session";

export function AppPageHeader({
  title,
  subtitle,
  period,
  actions,
}: {
  title: string;
  subtitle?: string;
  period?: ReactNode;
  actions?: ReactNode;
}) {
  const { user } = useSession();
  const editor = useTransactionEditor();
  const email = user?.email ?? "";
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      <div className="page-header-side">
        {period}
        <div className="page-header-actions">
          {actions}
          <button className="btn btn-primary quick-add" aria-label="Novo movimento" onClick={() => editor.create()}>
            <Plus size={16} />
            <span className="quick-label">Novo movimento</span>
          </button>
          <Link to="/definicoes" className="avatar" title={email} aria-label={`Perfil de ${email}`}>
            {email.charAt(0) || "?"}
          </Link>
        </div>
      </div>
    </header>
  );
}
