"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArgosLogo } from "@/components/logo";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registeredKey, setRegisteredKey] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { tenant, api_key } = await api.register(name);
      setRegisteredKey(api_key.api_key);
      localStorage.setItem("argos_api_key", api_key.api_key);
      localStorage.setItem("argos_tenant", JSON.stringify(tenant));
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      localStorage.setItem("argos_api_key", apiKeyInput);
      const wallets = await api.listWallets();
      if (!Array.isArray(wallets) && !((wallets as { error?: string }).error)) {
        router.push("/dashboard");
      } else if ((wallets as { error?: string }).error) {
        throw new Error("Invalid API key");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Invalid API key");
      localStorage.removeItem("argos_api_key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 geometric-bg" />

      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-[120px]"
        style={{ background: "radial-gradient(circle, #e8a838 0%, transparent 70%)" }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10 blur-[120px]"
        style={{ background: "radial-gradient(circle, #c98a1e 0%, transparent 70%)" }}
        animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-8"
      >
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <ArgosLogo size={64} />
          </div>
          <h1 className="font-display text-5xl mb-3 gold-gradient glow-text" style={{ fontWeight: 500 }}>
            Argos
          </h1>
          <p className="text-sm text-zinc-400 tracking-widest uppercase">
            All-Seeing Wallet Infrastructure
          </p>
        </div>

        <div className="bg-bg-surface border border-bg-border rounded-2xl p-8 backdrop-blur-sm">
          <div className="flex gap-1 mb-6 bg-bg p-1 rounded-lg">
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-sm rounded-md transition-all ${
                mode === "register"
                  ? "bg-amber text-black font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Create App
            </button>
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm rounded-md transition-all ${
                mode === "login"
                  ? "bg-amber text-black font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign In
            </button>
          </div>

          {registeredKey ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="text-center">
                <div className="text-amber text-sm mb-3">
                  Save this API key — it won&apos;t be shown again
                </div>
                <div className="bg-bg p-4 rounded-lg border border-amber/30 font-mono text-xs break-all">
                  {registeredKey}
                </div>
              </div>
              <p className="text-xs text-zinc-500 text-center">
                Redirecting to dashboard...
              </p>
            </motion.div>
          ) : mode === "register" ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
                  Application Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Web3 App"
                  required
                  className="input-field"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !name}
                className="btn-primary w-full"
              >
                {loading ? "Creating..." : "Create Application"}
              </button>
              <p className="text-xs text-zinc-500 text-center">
                You&apos;ll receive an API key to access your dashboard
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="ow_..."
                  required
                  className="input-field font-mono"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !apiKeyInput}
                className="btn-primary w-full"
              >
                {loading ? "Connecting..." : "Enter Dashboard"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-zinc-600">
          Argos Wallet · Self-hosted Web3 infrastructure
        </div>
      </motion.div>
    </div>
  );
}
