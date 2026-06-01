"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Copy,
  ExternalLink,
  Trash2,
  Link2,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";
import { api, Wallet } from "@/lib/api";

const NETWORKS = [
  { id: "ethereum", name: "Ethereum", color: "#627EEA" },
  { id: "polygon", name: "Polygon", color: "#8247E5" },
  { id: "base", name: "Base", color: "#0052FF" },
  { id: "arbitrum", name: "Arbitrum", color: "#28A0F0" },
];

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [externalId, setExternalId] = useState("");
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(["polygon"]);
  const [creating, setCreating] = useState(false);
  const [expandedWallet, setExpandedWallet] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState("");
  const [linkModal, setLinkModal] = useState<{ walletId: string } | null>(null);

  const fetchWallets = async () => {
    try {
      const w = await api.listWallets();
      setWallets(w as Wallet[]);
    } catch {
      setWallets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createWallet(externalId || `user-${Date.now()}`, selectedNetworks);
      setShowCreate(false);
      setExternalId("");
      setSelectedNetworks(["polygon"]);
      fetchWallets();
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Deactivate this wallet?")) return;
    await api.deactivateWallet(id);
    fetchWallets();
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(""), 2000);
  };

  const toggleNetwork = (id: string) => {
    setSelectedNetworks((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl mb-2" style={{ fontWeight: 500 }}>
            Wallets
          </h1>
          <p className="text-zinc-400">
            Create and manage wallets across multiple chains.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Wallet
        </button>
      </div>

      {loading ? (
        <div className="text-zinc-500 text-center py-20">Loading wallets...</div>
      ) : wallets.length === 0 ? (
        <div className="bg-bg-surface border border-bg-border rounded-xl p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-amber/10 flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-amber" />
          </div>
          <h3 className="font-display text-2xl mb-2" style={{ fontWeight: 500 }}>
            No wallets yet
          </h3>
          <p className="text-zinc-400 mb-6">
            Create your first wallet to start receiving payments.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            Create Wallet
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {wallets.map((wallet) => (
            <motion.div
              key={wallet.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-surface border border-bg-border rounded-xl overflow-hidden card-hover"
            >
              <div
                className="p-6 flex items-center justify-between cursor-pointer"
                onClick={() =>
                  setExpandedWallet(
                    expandedWallet === wallet.id ? null : wallet.id
                  )
                }
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-amber/10 flex items-center justify-center">
                    <span className="font-display text-amber text-lg">
                      {(wallet.external_id || wallet.id)[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">
                      {wallet.external_id || wallet.id.slice(0, 8)}
                    </div>
                    <div className="text-xs text-zinc-500 font-mono">
                      {wallet.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {Object.keys(wallet.addresses || {}).map((net) => {
                      const network = NETWORKS.find((n) => n.id === net);
                      return (
                        <div
                          key={net}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{
                            background: `${network?.color || "#666"}20`,
                            color: network?.color || "#666",
                          }}
                        >
                          {net[0].toUpperCase()}
                        </div>
                      );
                    })}
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full ${
                      wallet.status === "active"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-zinc-500/10 text-zinc-400"
                    }`}
                  >
                    {wallet.status}
                  </span>
                </div>
              </div>

              <AnimatePresence>
                {expandedWallet === wallet.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-bg-border overflow-hidden"
                  >
                    <div className="p-6 space-y-4">
                      <div>
                        <h4 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">
                          Addresses
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(wallet.addresses || {}).map(
                            ([network, address]) => (
                              <div
                                key={network}
                                className="flex items-center justify-between bg-bg rounded-lg p-3 border border-bg-border"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-zinc-400 capitalize w-20">
                                    {network}
                                  </span>
                                  <code className="text-sm font-mono text-zinc-200">
                                    {address}
                                  </code>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => copyAddress(address)}
                                    className="p-1.5 hover:bg-bg-elevated rounded transition-colors"
                                  >
                                    {copiedAddr === address ? (
                                      <Check className="w-4 h-4 text-green-400" />
                                    ) : (
                                      <Copy className="w-4 h-4 text-zinc-400" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {(wallet.balances || []).length > 0 && (
                        <div>
                          <h4 className="text-xs text-zinc-400 uppercase tracking-wider mb-3">
                            Balances
                          </h4>
                          <div className="grid grid-cols-3 gap-3">
                            {(wallet.balances || []).map((bal, i) => (
                              <div
                                key={i}
                                className="bg-bg rounded-lg p-3 border border-bg-border"
                              >
                                <div className="text-xs text-zinc-400">
                                  {bal.network} · {bal.token}
                                </div>
                                <div className="font-mono text-sm">
                                  {bal.balance}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setLinkModal({ walletId: wallet.id })}
                          className="btn-ghost flex items-center gap-2 text-sm"
                        >
                          <Link2 className="w-4 h-4" />
                          Link External
                        </button>
                        {wallet.status === "active" && (
                          <button
                            onClick={() => handleDeactivate(wallet.id)}
                            className="btn-ghost flex items-center gap-2 text-sm text-red-400 hover:border-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                            Deactivate
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-surface border border-bg-border rounded-2xl p-8 max-w-md w-full"
            >
              <h2 className="font-display text-3xl mb-6" style={{ fontWeight: 500 }}>
                Create New Wallet
              </h2>
              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
                    External ID (optional)
                  </label>
                  <input
                    type="text"
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                    placeholder="user-123"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-3 uppercase tracking-wider">
                    Networks
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {NETWORKS.map((net) => (
                      <button
                        key={net.id}
                        type="button"
                        onClick={() => toggleNetwork(net.id)}
                        className={`p-3 rounded-lg border text-sm flex items-center gap-2 transition-all ${
                          selectedNetworks.includes(net.id)
                            ? "border-amber bg-amber/10 text-amber"
                            : "border-bg-border text-zinc-400 hover:border-zinc-600"
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: net.color }}
                        />
                        {net.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || selectedNetworks.length === 0}
                    className="btn-primary flex-1"
                  >
                    {creating ? "Creating..." : "Create Wallet"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {linkModal && (
          <LinkExternalModal
            walletId={linkModal.walletId}
            onClose={() => setLinkModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LinkExternalModal({
  walletId,
  onClose,
}: {
  walletId: string;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState("metamask");
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState(137);
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(false);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinking(true);
    try {
      await api.linkExternal(walletId, provider, address, chainId);
      setLinked(true);
      setTimeout(onClose, 1500);
    } finally {
      setLinking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-surface border border-bg-border rounded-2xl p-8 max-w-md w-full"
      >
        {linked ? (
          <div className="text-center py-4">
            <Check className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="font-display text-2xl" style={{ fontWeight: 500 }}>
              Wallet Linked
            </h3>
          </div>
        ) : (
          <>
            <h2 className="font-display text-3xl mb-6" style={{ fontWeight: 500 }}>
              Link External Wallet
            </h2>
            <form onSubmit={handleLink} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
                  Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="input-field"
                >
                  <option value="metamask">MetaMask</option>
                  <option value="walletconnect">WalletConnect</option>
                  <option value="coinbase">Coinbase Wallet</option>
                  <option value="phantom">Phantom</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x..."
                  required
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-2 uppercase tracking-wider">
                  Chain ID
                </label>
                <input
                  type="number"
                  value={chainId}
                  onChange={(e) => setChainId(Number(e.target.value))}
                  className="input-field"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={linking} className="btn-primary flex-1">
                  {linking ? "Linking..." : "Link Wallet"}
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
