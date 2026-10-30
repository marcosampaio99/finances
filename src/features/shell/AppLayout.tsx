import {
  ArrowLeftRight,
  BarChart3,
  CircleAlert,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router";
import { logOut } from "@/features/auth/authService";
import { useTransactions } from "@/features/transactions/hooks";
import { TransactionEditorProvider } from "@/features/transactions/TransactionEditor";
import { Drawer } from "@/shared/ui/Drawer";

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
}

const MAIN: NavEntry[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { to: "/contas", label: "Contas", icon: Landmark },
  { to: "/orcamentos", label: "Orçamentos", icon: Target },
  { to: "/investimentos", label: "Investimentos", icon: TrendingUp },
];
const ANALYSIS: NavEntry[] = [{ to: "/relatorios", label: "Relatórios", icon: BarChart3 }];
const SETTINGS: NavEntry = { to: "/definicoes", label: "Definições", icon: Settings };

const COLLAPSED_KEY = "financas.sidebar";

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function NavItem({ entry, collapsed, onNavigate }: { entry: NavEntry; collapsed?: boolean; onNavigate?: () => void }) {
  const Icon = entry.icon;
  return (
    <NavLink
      to={entry.to}
      end={entry.to === "/"}
      title={collapsed ? entry.label : undefined}
      aria-label={collapsed ? entry.label : undefined}
      onClick={onNavigate}
      className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
    >
      <Icon size={17} />
      <span className="nav-text">{entry.label}</span>
    </NavLink>
  );
}

function RulesNotice() {
  const { transfersBlocked } = useTransactions();
  if (!transfersBlocked) return null;
  return (
    <div className="notice" style={{ marginBottom: 16 }} role="alert">
      <CircleAlert size={16} />
      <span>
        As regras de segurança do Firestore bloqueiam as coleções novas (transferências, orçamentos e
        histórico). Publica o ficheiro firestore.rules deste projeto para as ativar.
      </span>
    </div>
  );
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [moreOpen, setMoreOpen] = useState(false);

  function toggleCollapsed() {
    setCollapsed((current) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, current ? "0" : "1");
      } catch {
        // Sem armazenamento, a preferência vale apenas para esta sessão.
      }
      return !current;
    });
  }

  return (
    <TransactionEditorProvider>
      <div className={collapsed ? "shell collapsed" : "shell"}>
        <aside className="sidebar">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <Wallet size={15} />
            </span>
            <span className="brand-name">Finanças</span>
          </Link>
          <nav className="nav-group" aria-label="Principal">
            <div className="nav-label">Principal</div>
            {MAIN.map((entry) => (
              <NavItem key={entry.to} entry={entry} collapsed={collapsed} />
            ))}
          </nav>
          <nav className="nav-group" aria-label="Análise">
            <div className="nav-label">Análise</div>
            {ANALYSIS.map((entry) => (
              <NavItem key={entry.to} entry={entry} collapsed={collapsed} />
            ))}
          </nav>
          <div className="sidebar-end">
            <div className="nav-label">Sistema</div>
            <NavItem entry={SETTINGS} collapsed={collapsed} />
            <button className="nav-item" aria-label={collapsed ? "Terminar sessão" : undefined} title={collapsed ? "Terminar sessão" : undefined} onClick={() => logOut()}>
              <LogOut size={17} />
              <span className="nav-text">Terminar sessão</span>
            </button>
            <button
              className="nav-item"
              aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
              aria-expanded={!collapsed}
              onClick={toggleCollapsed}
            >
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
              <span className="nav-text">Recolher</span>
            </button>
          </div>
        </aside>

        <main className="main">
          <RulesNotice />
          <Outlet />
        </main>

        <nav className="bottom-nav" aria-label="Navegação">
          {MAIN.slice(0, 4).map((entry) => {
            const Icon = entry.icon;
            return (
              <NavLink key={entry.to} to={entry.to} end={entry.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
                <Icon size={19} />
                {entry.label}
              </NavLink>
            );
          })}
          <button type="button" aria-haspopup="dialog" onClick={() => setMoreOpen(true)}>
            <Menu size={19} />
            Mais
          </button>
        </nav>

        <Drawer open={moreOpen} onClose={() => setMoreOpen(false)} title="Mais">
          <div className="nav-group">
            {[MAIN[4]!, ...ANALYSIS, SETTINGS].map((entry) => (
              <NavItem key={entry.to} entry={entry} onNavigate={() => setMoreOpen(false)} />
            ))}
            <button className="nav-item" onClick={() => logOut()}>
              <LogOut size={17} />
              Terminar sessão
            </button>
          </div>
        </Drawer>
      </div>
    </TransactionEditorProvider>
  );
}
