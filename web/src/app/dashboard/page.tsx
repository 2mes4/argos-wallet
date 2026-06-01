"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  GitBranch,
  ArrowLeftRight,
  ArrowUpRight,
} from "lucide-react";
import { api, Wallet as WalletType, Transaction, RoutingRule } from "@/lib/api";

export default function DashboardOverview() {
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [w, tx] = await Promise.all([
          api.listWallets().catch(() => []),
          api.listTransactions().catch(() => []),
        ]);
        setWallets(w as WalletType[]);
        setTransactions(tx as Transaction[]);

        if ((w as WalletType[]).length > 0) {
          const r = await api.listRules((w as WalletType[])[0].id).catch(() => []);
          setRules(r as RoutingRule[]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    {
      label: "Total Wallets",
      value: wallets.length,
      icon: Wallet,
      change: "Active across chains",
    },
    {
      label: "Transactions",
      value: transactions.length,
      icon: ArrowLeftRight,
      change: "All time",
    },
    {
      label: "Active Rules",
      value: rules.filter((r) => r.enabled).length,
      icon: GitBranch,
      change: "Automation engines",
    },
    {
      label: "Networks",
      value: new Set(wallets.flatMap((w) => Object.keys(w.addresses || {}))).size,
      icon: TrendingUp,
      change: "Multi-chain coverage",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-amber animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl mb-2" style={{ fontWeight: 500 }}>
          Welcome back
        </h1>
        <p className="text-zinc-400">
          Argos is watching over your wallets across all chains.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-bg-surface border border-bg-border rounded-xl p-6 card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-amber" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-600" />
              </div>
              <div className="font-display text-4xl mb-1" style={{ fontWeight: 500 }}>
                {stat.value}
              </div>
              <div className="text-xs text-zinc-400">{stat.label}</div>
              <div className="text-xs text-zinc-600 mt-2">{stat.change}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-bg-surface border border-bg-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl" style={{ fontWeight: 500 }}>
              Recent Wallets
            </h2>
            <a href="/dashboard/wallets" className="text-xs text-amber hover:underline">
              View all
            </a>
          </div>
          {wallets.length === 0 ? (
            <div className="text-zinc-500 text-sm py-8 text-center">
              No wallets yet. Create one to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {wallets.slice(0, 5).map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-3 bg-bg rounded-lg border border-bg-border"
                >
                  <div>
                    <div className="text-sm font-medium">{w.external_id || w.id.slice(0, 8)}</div>
                    <div className="text-xs text-zinc-500 font-mono">
                      {Object.keys(w.addresses || {}).join(", ")}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      w.status === "active"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-zinc-500/10 text-zinc-400"
                    }`}
                  >
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-bg-surface border border-bg-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl" style={{ fontWeight: 500 }}>
              Recent Transactions
            </h2>
            <a href="/dashboard/transactions" className="text-xs text-amber hover:underline">
              View all
            </a>
          </div>
          {transactions.length === 0 ? (
            <div className="text-zinc-500 text-sm py-8 text-center">
              No transactions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-bg rounded-lg border border-bg-border"
                >
                  <div>
                    <div className="text-sm font-medium capitalize">
                      {tx.type.replace(/_/g, " ")}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {tx.source_network} · {tx.source_token || "native"}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      tx.status === "confirmed" || tx.status === "executed"
                        ? "bg-green-500/10 text-green-400"
                        : tx.status === "pending"
                        ? "bg-amber/10 text-amber"
                        : "bg-zinc-500/10 text-zinc-400"
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
