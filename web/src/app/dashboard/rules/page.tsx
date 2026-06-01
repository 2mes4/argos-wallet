"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Play, Trash2, Zap } from "lucide-react";
import { api, Wallet, RoutingRule } from "@/lib/api";

export default function RulesPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState("sweep");
  const [conditions, setConditions] = useState('{"network":"polygon","token":"USDC","trigger":"on_receive"}');
  const [actions, setActions] = useState('{"amount":"all"}');
  const [creating, setCreating] = useState(false);

  const fetch = async () => {
    try {
      const w = (await api.listWallets()) as Wallet[];
      setWallets(w);
      if (w.length > 0) {
        setSelectedWallet(w[0].id);
        const r = await api.listRules(w[0].id);
        setRules(r as RoutingRule[]);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleWalletChange = async (id: string) => {
    setSelectedWallet(id);
    const r = await api.listRules(id).catch(() => []);
    setRules(r as RoutingRule[]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createRule({
        wallet_id: selectedWallet,
        name: ruleName,
        type: ruleType,
        conditions: JSON.parse(conditions),
        actions: JSON.parse(actions),
      });
      setShowCreate(false);
      setRuleName("");
      const r = await api.listRules(selectedWallet);
      setRules(r as RoutingRule[]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  };

  const handleExecute = async (id: string) => {
    await api.executeRule(id);
    const r = await api.listRules(selectedWallet);
    setRules(r as RoutingRule[]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    await api.deleteRule(id);
    const r = await api.listRules(selectedWallet);
    setRules(r as RoutingRule[]);
  };

  const typeColors: Record<string, string> = {
    sweep: "bg-blue-500/10 text-blue-400",
    split: "bg-purple-500/10 text-purple-400",
    forward: "bg-green-500/10 text-green-400",
    fiat_offramp: "bg-orange-500/10 text-orange-400",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl mb-2" style={{ fontWeight: 500 }}>
            Routing Rules
          </h1>
          <p className="text-zinc-400">
            Automate sweeps, splits, and forwards across wallets.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={wallets.length === 0}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {wallets.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {wallets.map((w) => (
            <button
              key={w.id}
              onClick={() => handleWalletChange(w.id)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                selectedWallet === w.id
                  ? "bg-amber/10 text-amber border border-amber/30"
                  : "bg-bg-surface text-zinc-400 border border-bg-border hover:border-zinc-600"
              }`}
            >
              {w.external_id || w.id.slice(0, 8)}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-zinc-500 text-center py-20">Loading...</div>
      ) : rules.length === 0 ? (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-16 text-center">
          <Zap className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 mb-4">No routing rules for this wallet.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            Create First Rule
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-bg-surface border border-bg-border rounded-xl p-6 card-hover"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display text-xl" style={{ fontWeight: 500 }}>
                      {rule.name}
                    </h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full ${
                        typeColors[rule.type] || "bg-zinc-500/10 text-zinc-400"
                      }`}
                    >
                      {rule.type}
                    </span>
                    {rule.enabled ? (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400">
                        enabled
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400">
                        disabled
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 space-y-1">
                    <div>
                      <span className="text-zinc-400">Conditions:</span>{" "}
                      {JSON.stringify(rule.conditions)}
                    </div>
                    <div>
                      <span className="text-zinc-400">Actions:</span>{" "}
                      {JSON.stringify(rule.actions)}
                    </div>
                    <div>Executions: {rule.execution_count}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExecute(rule.id)}
                    className="p-2 hover:bg-amber/10 rounded-lg transition-colors group"
                    title="Execute"
                  >
                    <Play className="w-4 h-4 text-zinc-400 group-hover:text-amber" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-zinc-400 group-hover:text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-surface border border-bg-border rounded-2xl p-8 max-w-lg w-full"
            >
              <h2 className="font-display text-3xl mb-6" style={{ fontWeight: 500 }}>
                Create Routing Rule
              </h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="Auto-sweep USDC"
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
                    Type
                  </label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value)}
                    className="input-field"
                  >
                    <option value="sweep">Sweep</option>
                    <option value="split">Split</option>
                    <option value="forward">Forward</option>
                    <option value="fiat_offramp">Fiat Offramp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
                    Conditions (JSON)
                  </label>
                  <textarea
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
                    rows={3}
                    className="input-field font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
                    Actions (JSON)
                  </label>
                  <textarea
                    value={actions}
                    onChange={(e) => setActions(e.target.value)}
                    rows={3}
                    className="input-field font-mono text-xs"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating} className="btn-primary flex-1">
                    {creating ? "Creating..." : "Create Rule"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
