"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Eye, MessageSquare } from "lucide-react";

export default function SettingsPage() {
  const [walletId, setWalletId] = useState("");
  const [message, setMessage] = useState("auth-challenge");
  const [signResult, setSignResult] = useState<{ signature: string; address: string } | null>(null);
  const [signing, setSigning] = useState(false);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigning(true);
    try {
      const result = await api.signMessage(walletId, message);
      setSignResult(result);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Sign failed");
    } finally {
      setSigning(false);
    }
  };

  const tenantStr = typeof window !== "undefined" ? localStorage.getItem("argos_tenant") : null;
  const tenant = tenantStr ? JSON.parse(tenantStr) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl mb-2" style={{ fontWeight: 500 }}>
          Settings
        </h1>
        <p className="text-zinc-400">Application configuration and identity tools.</p>
      </div>

      {tenant && (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-6">
          <h2 className="font-display text-2xl mb-4" style={{ fontWeight: 500 }}>
            Application Info
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Name</div>
              <div className="text-sm">{tenant.name}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Schema</div>
              <div className="text-sm font-mono text-zinc-400">{tenant.schema_name || tenant.schema}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Plan</div>
              <div className="text-sm capitalize">{tenant.plan}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Created</div>
              <div className="text-sm">{tenant.created_at ? new Date(tenant.created_at).toLocaleString() : "—"}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-bg-surface border border-bg-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-5 h-5 text-amber" />
          <h2 className="font-display text-2xl" style={{ fontWeight: 500 }}>
            Identity Signing
          </h2>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Sign a message with a wallet&apos;s private key for authentication.
        </p>
        <form onSubmit={handleSign} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
              Wallet ID
            </label>
            <input
              type="text"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              placeholder="UUID"
              required
              className="input-field font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
              Message
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <button type="submit" disabled={signing} className="btn-primary">
            {signing ? "Signing..." : "Sign Message"}
          </button>
        </form>

        {signResult && (
          <div className="mt-6 space-y-3">
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Address</div>
              <div className="font-mono text-sm bg-bg rounded-lg p-3 border border-bg-border">{signResult.address}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Signature</div>
              <div className="font-mono text-xs bg-bg rounded-lg p-3 border border-bg-border break-all">{signResult.signature}</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-bg-surface border border-bg-border rounded-xl p-6">
        <h2 className="font-display text-2xl mb-4" style={{ fontWeight: 500 }}>
          About Argos
        </h2>
        <div className="text-sm text-zinc-400 space-y-2">
          <p>
            <strong className="text-zinc-200">Argos Wallet</strong> is self-hosted, multi-tenant wallet
            infrastructure for Web3 applications. Built with Go, PostgreSQL, and Next.js.
          </p>
          <p>
            Argos uses schema-per-tenant isolation for maximum data separation. All private keys are
            server-side and never exposed.
          </p>
          <p className="text-xs text-zinc-500 pt-2">
            Version 0.1.0 · MIT License · github.com/2mes4/argos-wallet
          </p>
        </div>
      </div>
    </div>
  );
}
