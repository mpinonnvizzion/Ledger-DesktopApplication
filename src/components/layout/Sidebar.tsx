import { NavLink } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";

const navItems = [
  { to: "/", label: "Dashboard", icon: "⊞" },
  { to: "/accounts", label: "Accounts", icon: "◈" },
  { to: "/transactions", label: "Transactions", icon: "↕" },
  { to: "/categories", label: "Categories", icon: "⊛" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar() {
  const { currentWorkspace } = useWorkspace();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-gray-200 bg-gray-50">
      {/* App name */}
      <div className="flex h-14 items-center border-b border-gray-200 px-5">
        <span className="text-lg font-bold text-primary-700">Ledger</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4" aria-label="Main navigation">
        <ul className="space-y-0.5" role="list">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                    isActive
                      ? "bg-primary-100 text-primary-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  ].join(" ")
                }
              >
                <span className="shrink-0 text-base" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Workspace indicator */}
      {currentWorkspace && (
        <div className="border-t border-gray-200 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Workspace
          </p>
          <p
            className="mt-0.5 truncate text-sm font-medium text-gray-800"
            title={currentWorkspace.name}
          >
            {currentWorkspace.name}
          </p>
        </div>
      )}
    </aside>
  );
}
