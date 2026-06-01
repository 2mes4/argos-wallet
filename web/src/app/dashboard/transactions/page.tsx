"use client";

import { useEffect, useState } from "react";
import { api, Transaction } from "@/lib/api";
import { ArrowLeftRight } from "lucide-react";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listTransactions()
      .then((t) => setTransactions(t as Transaction[]))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (status: string) => {
    if (status === "confirmed" || status === "executed")
      return "bg-green-500/10 text-green-400";
    if (status === "pending" || status === "initiated")
      return "bg-amber/10 text-amber";
    if (status === "failed" || status === "cancelled")
      return "bg-red-500/10 text-red-400";
    return "bg-zinc-500/10 text-zinc-400";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl mb-2" style={{ fontWeight: 500 }}>
          Transactions
        </h1>
        <p className="text-zinc-400">All transactions across your wallets.</p>
      </div>

      {loading ? (
        <div className="text-zinc-500 text-center py-20">Loading...</div>
      ) : transactions.length === 0 ? (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-16 text-center">
          <ArrowLeftRight className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">No transactions yet.</p>
        </div>
      ) : (
        <div className="bg-bg-surface border border-bg-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-bg-border text-xs text-zinc-400 uppercase tracking-wider">
                <th className="text-left p-4">Type</th>
                <th className="text-left p-4">Network</th>
                <th className="text-left p-4">Amount</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-bg-border hover:bg-bg-elevated transition-colors"
                >
                  <td className="p-4 capitalize text-sm">
                    {tx.type.replace(/_/g, " ")}
                  </td>
                  <td className="p-4 text-sm text-zinc-400">
                    {tx.source_network}
                  </td>
                  <td className="p-4 text-sm font-mono">
                    {tx.source_amount} {tx.source_token || ""}
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full ${statusColor(
                        tx.status
                      )}`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-500">
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
