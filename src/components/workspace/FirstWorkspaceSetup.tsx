import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { parseCommandError } from "@/lib/errors";

interface FirstWorkspaceSetupProps {
  onCreate: (name: string) => Promise<void>;
}

export function FirstWorkspaceSetup({ onCreate }: FirstWorkspaceSetupProps) {
  const [name, setName] = useState("Personal Finance");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    try {
      await onCreate(trimmed);
    } catch (err) {
      const parsed = parseCommandError(err);
      setError(parsed.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        {/* Logo / app name */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-3xl font-bold text-primary-700">Ledger</div>
          <h1 className="text-xl font-semibold text-gray-900">
            Create your first workspace
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            A workspace holds your accounts, categories, and transactions. You
            can rename it at any time.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4">
              <ErrorMessage message={error} />
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} noValidate>
            <Input
              id="workspace-name"
              label="Workspace name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Personal Finance"
              disabled={submitting}
              autoFocus
              required
            />

            <div className="mt-6">
              <Button
                type="submit"
                loading={submitting}
                disabled={!name.trim()}
                className="w-full justify-center"
              >
                Create workspace
              </Button>
            </div>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Your data is stored locally on this device.
        </p>
      </div>
    </div>
  );
}
