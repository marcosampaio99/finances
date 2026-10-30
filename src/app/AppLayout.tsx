import { NavLink, Outlet } from "react-router";
import { logOut } from "@/features/auth/authService";

const TABS = [
  { to: "/", label: "Visão Geral" },
  { to: "/despesas", label: "Despesas" },
  { to: "/receitas", label: "Receitas" },
  { to: "/investimentos", label: "Investimentos" },
];

export function AppLayout() {
  return (
    <>
      <div className="topbar">
        <h1>💰 Finanças</h1>
        <button className="ghost" onClick={() => logOut()}>
          Sair
        </button>
      </div>

      <nav className="tabs">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            className={({ isActive }) => (isActive ? "tab active" : "tab")}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </>
  );
}
