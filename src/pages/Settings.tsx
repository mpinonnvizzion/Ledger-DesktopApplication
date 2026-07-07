import { useState } from "react";
import { greet } from "@/api/client";

export default function Settings() {
  const [name, setName] = useState("");
  const [greeting, setGreeting] = useState("");

  async function handleGreet() {
    const result = await greet(name || "World");
    setGreeting(result);
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
      <p className="mt-2 text-gray-600">
        Application preferences and configuration. Coming in a future sprint.
      </p>

      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h3 className="text-sm font-medium text-gray-900">Rust IPC Test</h3>
        <p className="mt-1 text-sm text-gray-500">
          Proves the frontend can invoke Rust commands via Tauri.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            onClick={handleGreet}
            className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            Greet
          </button>
        </div>
        {greeting && <p className="mt-3 text-sm text-gray-700">{greeting}</p>}
      </div>
    </div>
  );
}
