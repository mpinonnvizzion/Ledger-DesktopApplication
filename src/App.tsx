import { useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import AppShell from "@/components/layout/AppShell";
import { FirstWorkspaceSetup } from "@/components/workspace/FirstWorkspaceSetup";
import { PageLoadingState } from "@/components/ui/LoadingSpinner";
import { PageErrorState } from "@/components/ui/ErrorMessage";
import { Button } from "@/components/ui/Button";
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import Transactions from "@/pages/Transactions";
import Categories from "@/pages/Categories";
import Settings from "@/pages/Settings";

function SeedingRecovery({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => Promise<void>;
}) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="max-w-sm text-center">
        <h1 className="mb-2 text-lg font-semibold text-gray-900">
          Category Setup Failed
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Your workspace was created, but default categories could not be
          initialized. You can retry or continue without them.
        </p>
        <p className="mb-6 rounded bg-red-50 px-4 py-2 text-xs text-red-700">
          {message}
        </p>
        <Button onClick={handleRetry} loading={retrying}>
          Retry Category Setup
        </Button>
      </div>
    </div>
  );
}

function AppRouter() {
  const {
    loading,
    error,
    workspaces,
    seedingError,
    createInitialWorkspace,
    refreshWorkspaces,
    retrySeedCategories,
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

  if (seedingError) {
    return (
      <SeedingRecovery message={seedingError} onRetry={retrySeedCategories} />
    );
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
