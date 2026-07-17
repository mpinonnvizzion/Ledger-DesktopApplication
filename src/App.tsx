import { HashRouter, Routes, Route } from "react-router-dom";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import AppShell from "@/components/layout/AppShell";
import { FirstWorkspaceSetup } from "@/components/workspace/FirstWorkspaceSetup";
import { PageLoadingState } from "@/components/ui/LoadingSpinner";
import { PageErrorState } from "@/components/ui/ErrorMessage";
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import Transactions from "@/pages/Transactions";
import Categories from "@/pages/Categories";
import Settings from "@/pages/Settings";

function AppRouter() {
  const {
    loading,
    error,
    workspaces,
    createInitialWorkspace,
    refreshWorkspaces,
  } = useWorkspace();

  if (loading) {
    return <PageLoadingState label="Starting Ledger…" />;
  }

  if (error) {
    return (
      <PageErrorState
        message="Could not load your workspace. Please restart the application."
        onRetry={refreshWorkspaces}
      />
    );
  }

  if (workspaces.length === 0) {
    return <FirstWorkspaceSetup onCreate={createInitialWorkspace} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  return (
    <WorkspaceProvider>
      <AppRouter />
    </WorkspaceProvider>
  );
}
