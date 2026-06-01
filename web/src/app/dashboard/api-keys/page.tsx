"use client";

import { useState } from "react";
import { Copy, Check, Eye, EyeOff, Key } from "lucide-react";

export default function ApiKeysPage() {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const apiKey = typeof window !== "undefined" ? localStorage.getItem("argos_api_key") || "" : "";

  const copy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tenantStr = typeof window !== "undefined" ? localStorage.getItem("argos_tenant") : null;
  const tenant = tenantStr ? JSON.parse(tenantStr) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl mb-2" style={{ fontWeight: 500 }}>
          API Keys
        </h1>
        <p className="text-zinc-400">Manage your application credentials.</p>
      </div>

      <div className="bg-bg-surface border border-bg-border rounded-xl p-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Key className="w-5 h-5 text-amber" />
          <h2 className="font-display text-2xl" style={{ fontWeight: 500 }}>
            Default Key
          </h2>
        </div>

        {tenant && (
          <div className="space-y-3 mb-6 pb-6 border-b border-bg-border">
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Application</div>
              <div className="text-sm">{tenant.name}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Plan</div>
              <div className="text-sm capitalize">{tenant.plan}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Tenant ID</div>
              <div className="text-sm font-mono">{tenant.id}</div>
            </div>
          </div>
        )}

        <div>
          <div className="text-xs text-zinc-400 uppercase tracking-wider mb-2">API Key</div>
          <div className="flex items-center gap-2 bg-bg rounded-lg p-3 border border-bg-border">
            <code className="flex-1 font-mono text-sm text-zinc-200 truncate">
              {showKey ? apiKey : "ow_•••••••••••••••••••••••••••"}
            </code>
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-1.5 hover:bg-bg-elevated rounded transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4 text-zinc-400" /> : <Eye className="w-4 h-4 text-zinc-400" />}
            </button>
            <button onClick={copy} className="p-1.5 hover:bg-bg-elevated rounded transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            Use this key in the <code className="text-amber">Authorization: Bearer</code> header for all API requests.
          </p>
        </div>
      </div>

      <div className="bg-amber/5 border border-amber/20 rounded-xl p-6 max-w-2xl">
        <h3 className="text-amber text-sm font-medium mb-2">Quick Start</h3>
        <pre className="text-xs font-mono text-zinc-300 bg-bg rounded-lg p-4 overflow-x-auto">
{`curl -H "Authorization: Bearer ${showKey ? apiKey : "YOUR_API_KEY"}" \\
     -H "Content-Type: application/json" \\
     http://localhost:8080/v1/wallets`}
        </pre>
      </div>
    </div>
  );
}
