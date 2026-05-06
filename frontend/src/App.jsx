// ------------------------------------------------------------
// 🌟 Stellar Messenger DApp
// Decentralised Encrypted Peer-to-Peer Chat on Stellar Blockchain
// ------------------------------------------------------------
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  MessageCircle, Send, Check, CheckCheck, User, LogOut,
  Loader2, Plus, X, Copy, Search, Wallet, Shield, Globe, Lock, KeyRound,
} from "lucide-react";
import { encrypt, decrypt } from "./utils/encryption";
import { sendMessage, getMessageCount, markAsRead, fetchConversation, setDemoKeypair, getDemoPublicKey, clearDemoKeypair } from "./utils/soroban";
import { connectFreighter } from "./services/freighter.service";

const CONTACTS_KEY = "stellar_messenger_contacts";
const shorten = (a) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "");

// ============================================================
// 🔔 Toast Notification System
// ============================================================
const Toast = ({ toasts, removeToast }) => (
  <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-medium pointer-events-auto
          animate-fade-in border
          ${t.type === "error"
            ? "bg-red-900/90 border-red-700"
            : t.type === "success"
            ? "bg-green-900/90 border-green-700"
            : "bg-gray-800/90 border-gray-700"
          }`}
      >
        <span>{t.message}</span>
        <button onClick={() => removeToast(t.id)} className="ml-1 text-white/60 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    ))}
  </div>
);

// ============================================================
// ➕ Add Contact Modal
// ============================================================
const AddContactModal = ({ onAdd, onClose }) => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return setError("Please enter a name.");
    if (!address.trim() || address.length < 50 || !address.startsWith("G")) {
      return setError("Enter a valid Stellar address starting with G (56 chars).");
    }
    setError("");
    onAdd({ name: name.trim(), address: address.trim() });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white font-bold text-xl">Add Contact</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">Contact Name</label>
            <input
              className="w-full bg-gray-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none placeholder-gray-500"
              placeholder="e.g. Alice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1.5 block">Stellar Wallet Address</label>
            <textarea
              className="w-full bg-gray-700 text-white rounded-xl px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none placeholder-gray-500 resize-none"
              placeholder="GABC...XYZ"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value.trim())}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleAdd}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] shadow-lg"
          >
            Add Contact
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 🚀 Welcome / Login Screen
// ============================================================
const WelcomeScreen = ({ onConnect, isConnecting, onDemoMode }) => (
  <div className="h-screen bg-gray-900 flex items-center justify-center relative overflow-hidden">
    {/* Background blobs */}
    <div className="absolute top-[-80px] left-[-80px] w-96 h-96 bg-purple-700/20 rounded-full blur-3xl" />
    <div className="absolute bottom-[-80px] right-[-80px] w-96 h-96 bg-pink-700/20 rounded-full blur-3xl" />

    <div className="relative z-10 text-center max-w-lg px-6">
      <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
        <MessageCircle className="w-12 h-12 text-white" />
      </div>

      <h1 className="text-5xl font-extrabold text-white mb-3 tracking-tight">
        Stellar Messenger
      </h1>
      <p className="text-purple-400 font-semibold text-lg mb-2">
        Decentralized · Encrypted · Private
      </p>
      <p className="text-gray-400 text-sm mb-10 leading-relaxed">
        Your messages are encrypted client-side and stored permanently on the{" "}
        <span className="text-white font-medium">Stellar blockchain</span>.
        No servers. No surveillance. No censorship.
      </p>

      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className="flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isConnecting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Wallet className="w-6 h-6" />}
          {isConnecting ? "Connecting..." : "Connect Freighter Wallet"}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-gray-500 text-xs">or</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        <button
          onClick={onDemoMode}
          className="flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all hover:scale-105"
        >
          <KeyRound className="w-6 h-6 text-yellow-400" />
          Use Secret Key (Demo)
        </button>
      </div>

      <p className="text-gray-600 text-xs mt-4">
        Demo mode signs transactions directly — no extension needed
      </p>

      <div className="mt-10 grid grid-cols-3 gap-3">
        {[
          { icon: Lock, label: "E2E Encrypted", desc: "AES encrypted before leaving your device" },
          { icon: Globe, label: "On-Chain", desc: "Stored on the Stellar blockchain" },
          { icon: Shield, label: "No Server", desc: "Fully decentralised, peer-to-peer" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-4 text-center">
            <Icon className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <p className="text-white font-semibold text-xs mb-1">{label}</p>
            <p className="text-gray-500 text-xs leading-snug">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================================
// 🔑 Demo Mode Secret Key Login Modal
// ============================================================
const DemoLoginModal = ({ onLogin, onClose }) => {
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const key = secretKey.trim();
    if (!key.startsWith("S") || key.length !== 56) {
      return setError("Invalid secret key — must start with S and be 56 characters.");
    }
    setLoading(true);
    try {
      setDemoKeypair(key);
      const pubKey = getDemoPublicKey();
      onLogin(pubKey);
    } catch (e) {
      setError("Invalid secret key: " + e.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-yellow-600/40 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-yellow-400" />
            <h2 className="text-white font-bold text-lg">Demo Mode Login</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-yellow-900/30 border border-yellow-700/40 rounded-xl p-3 mb-4">
          <p className="text-yellow-300 text-xs">
            ⚠️ Demo/testnet only. Paste your testnet secret key to sign transactions directly — no Freighter extension needed.
          </p>
        </div>

        <p className="text-gray-400 text-sm mb-3">Use Account 2 secret key (Demo Sender):</p>
        <div className="bg-gray-900 rounded-xl p-3 mb-4 font-mono text-xs text-green-400 break-all select-all cursor-pointer"
          onClick={() => setSecretKey("SAQIYQSNUAU4KFNWCZWM66ZZUO524NZ25TYXAS4NGJ7EJQYITR6534KZ")}>
          SAQIYQSNUAU4KFNWCZWM66ZZUO524NZ25TYXAS4NGJ7EJQYITR6534KZ
          <span className="text-gray-500 ml-2">(click to fill)</span>
        </div>

        <textarea
          className="w-full bg-gray-700 text-white rounded-xl px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-yellow-500 outline-none resize-none placeholder-gray-500 mb-3"
          placeholder="S... (56 character secret key)"
          rows={2}
          value={secretKey}
          onChange={(e) => { setSecretKey(e.target.value.trim()); setError(""); }}
        />

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading || !secretKey.trim()}
          className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Login with Secret Key"}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// 💬 Message Bubble
// ============================================================
const MessageBubble = ({ message, isSent }) => {
  const ts =
    typeof message.timestamp === "number" && message.timestamp > 1e12
      ? message.timestamp
      : message.timestamp * 1000;

  const time = new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isSent ? "justify-end" : "justify-start"} mb-2 px-4`}>
      <div
        className={`max-w-xs lg:max-w-md xl:max-w-lg rounded-2xl px-4 py-2.5 shadow-md
          ${isSent
            ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-br-none"
            : "bg-gray-700 text-white rounded-bl-none"
          }`}
      >
        <p className="break-words text-sm leading-relaxed">{message.content}</p>
        <div className="flex items-center justify-end gap-1 mt-1 text-xs opacity-60">
          <span>{time}</span>
          {isSent &&
            (message.isRead ? (
              <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ✍️ Chat Input
// ============================================================
const ChatInput = ({ onSend, isLoading }) => {
  const [msg, setMsg] = useState("");

  const sendNow = () => {
    if (msg.trim() && !isLoading) {
      onSend(msg.trim());
      setMsg("");
    }
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur border-t border-gray-700/50 px-4 py-3 flex items-center gap-3">
      <input
        className="flex-1 bg-gray-700/80 text-white rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none placeholder-gray-500"
        placeholder="Type a message…"
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendNow()}
      />
      <button
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-full p-3 disabled:opacity-40 transition-all shadow-lg hover:scale-105"
        disabled={!msg.trim() || isLoading}
        onClick={sendNow}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </button>
    </div>
  );
};

// ============================================================
// 📇 Sidebar / Contact List
// ============================================================
const Sidebar = ({
  contacts, selected, onSelect, onAddContact,
  userAddress, onDisconnect, onCopyAddress,
}) => {
  const [search, setSearch] = useState("");
  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-72 xl:w-80 bg-gray-800/70 border-r border-gray-700/50 flex flex-col flex-shrink-0">
      {/* My wallet card */}
      <div className="px-4 py-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">My Wallet</p>
              <p className="text-gray-400 text-xs font-mono">{shorten(userAddress)}</p>
            </div>
          </div>
          <button
            onClick={onDisconnect}
            className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Disconnect wallet"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Copy address */}
        <button
          onClick={onCopyAddress}
          className="w-full flex items-center gap-2 bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-gray-200 text-xs px-3 py-2 rounded-lg transition-colors font-mono group"
          title="Copy address"
        >
          <Copy className="w-3 h-3 flex-shrink-0 group-hover:text-purple-400 transition-colors" />
          <span className="truncate">{userAddress}</span>
        </button>
      </div>

      {/* Search + Add */}
      <div className="px-4 py-3 border-b border-gray-700/50 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={onAddContact}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg p-2 transition-all hover:scale-105 shadow-md flex-shrink-0"
          title="Add new contact"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm leading-relaxed">
            {contacts.length === 0 ? (
              <>
                No contacts yet.
                <br />
                Click <span className="text-purple-400 font-semibold">+</span> to add one.
              </>
            ) : (
              "No contacts match your search."
            )}
          </div>
        ) : (
          filtered.map((c, i) => {
            const isSelected = selected?.address === c.address;
            return (
              <button
                key={i}
                onClick={() => onSelect(c)}
                className={`w-full px-4 py-3.5 flex items-center gap-3 hover:bg-gray-700/50 transition-colors border-b border-gray-700/30
                  ${isSelected ? "bg-gray-700/60 border-l-2 border-l-purple-500" : ""}`}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-white font-bold text-sm">
                    {c.name[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-white font-medium text-sm">{c.name}</p>
                  <p className="text-gray-400 text-xs font-mono truncate">{shorten(c.address)}</p>
                </div>
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// ============================================================
// 🚀 MAIN APP
// ============================================================
export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showDemoLogin, setShowDemoLogin] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toasts, setToasts] = useState([]);

  const chatEndRef = useRef(null);
  const pollRef = useRef(null);
  const lastMsgCountRef = useRef(0);
  const selectedContactRef = useRef(null);
  const userAddressRef = useRef("");

  // Keep refs in sync with state (for use inside setInterval)
  useEffect(() => { selectedContactRef.current = selectedContact; }, [selectedContact]);
  useEffect(() => { userAddressRef.current = userAddress; }, [userAddress]);

  // ── Toast helpers ──────────────────────────────────────────
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Load contacts from localStorage ───────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(CONTACTS_KEY);
    if (saved) {
      try { setContacts(JSON.parse(saved)); } catch {}
    }
  }, []);

  const saveContacts = (updated) => {
    setContacts(updated);
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(updated));
  };

  const addContact = (contact) => {
    if (contacts.find((c) => c.address === contact.address)) {
      return addToast("Contact already exists.", "error");
    }
    saveContacts([...contacts, contact]);
    addToast(`${contact.name} added!`, "success");
  };

  // ── Connect wallet ─────────────────────────────────────────
  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const { address } = await connectFreighter();
      setUserAddress(address);
      setIsConnected(true);
      addToast("Wallet connected!", "success");
    } catch (e) {
      addToast(e.message || "Freighter connection failed.", "error");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    clearInterval(pollRef.current);
    setIsConnected(false);
    setIsDemoMode(false);
    clearDemoKeypair();
    setUserAddress("");
    setSelectedContact(null);
    setMessages([]);
    addToast("Wallet disconnected.");
  };

  // ── Load conversation ──────────────────────────────────────
  const loadConversation = useCallback(async (me, otherAddr) => {
    try {
      const msgs = await fetchConversation(me, otherAddr);
      const uiMsgs = msgs.map((m) => ({
        id: m.msg_id ?? m.id,
        sender: typeof m.sender === "string" ? m.sender : String(m.sender),
        receiver: typeof m.receiver === "string" ? m.receiver : String(m.receiver),
        content: decrypt(m.encrypted_content),
        timestamp: m.timestamp,
        isRead: m.is_read,
      }));
      setMessages(uiMsgs);

      // Wire up: mark received unread messages as read
      for (const m of uiMsgs) {
        if (m.receiver === me && !m.isRead) {
          markAsRead(m.id, me).catch(() => {});
        }
      }
    } catch (e) {
      console.error("loadConversation error:", e);
    }
  }, []);

  // ── Select contact ─────────────────────────────────────────
  const selectContact = useCallback(async (contact) => {
    setSelectedContact(contact);
    setMessages([]);
    if (userAddressRef.current && contact?.address) {
      await loadConversation(userAddressRef.current, contact.address);
    }
  }, [loadConversation]);

  // ── Real-time polling (every 5 s) ─────────────────────────
  const startPolling = useCallback(() => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const count = Number(await getMessageCount());
        setTotalMessages(count);
        const contact = selectedContactRef.current;
        const me = userAddressRef.current;
        if (count > lastMsgCountRef.current && contact?.address && me) {
          lastMsgCountRef.current = count;
          await loadConversation(me, contact.address);
        }
      } catch {}
    }, 5000);
  }, [loadConversation]);

  useEffect(() => {
    if (isConnected && userAddress) {
      startPolling();
      getMessageCount()
        .then((c) => {
          const n = Number(c);
          setTotalMessages(n);
          lastMsgCountRef.current = n;
        })
        .catch(() => {});
    }
    return () => clearInterval(pollRef.current);
  }, [isConnected, userAddress, startPolling]);

  // ── Auto-scroll ────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ───────────────────────────────────────────
  const handleSend = async (text) => {
    if (!selectedContact) return;
    setIsLoading(true);
    try {
      const encrypted = encrypt(text);
      const res = await sendMessage(userAddress, selectedContact.address, encrypted);

      setMessages((prev) => [
        ...prev,
        {
          id: res.msgId || Date.now(),
          sender: userAddress,
          receiver: selectedContact.address,
          content: text,
          timestamp: Date.now(),
          isRead: false,
        },
      ]);

      const c = Number(await getMessageCount());
      setTotalMessages(c);
      lastMsgCountRef.current = c;
      addToast("Message sent on-chain ✓", "success");
    } catch (e) {
      console.error("sendMessage failed:", e);
      addToast("Failed to send: " + (e.message || "Unknown error"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render: Not connected ──────────────────────────────────
  if (!isConnected) {
    return (
      <>
        <Toast toasts={toasts} removeToast={removeToast} />
        {showDemoLogin && (
          <DemoLoginModal
            onLogin={(pubKey) => {
              setUserAddress(pubKey);
              setIsConnected(true);
              setIsDemoMode(true);
              setShowDemoLogin(false);
              addToast("Demo mode active — signing with secret key", "success");
            }}
            onClose={() => setShowDemoLogin(false)}
          />
        )}
        <WelcomeScreen
          onConnect={connectWallet}
          isConnecting={isConnecting}
          onDemoMode={() => setShowDemoLogin(true)}
        />
      </>
    );
  }

  // ── Render: Connected ──────────────────────────────────────
  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <Toast toasts={toasts} removeToast={removeToast} />
      {showAddModal && (
        <AddContactModal onAdd={addContact} onClose={() => setShowAddModal(false)} />
      )}

      {/* Top bar */}
      <header className="bg-gray-800/80 backdrop-blur border-b border-gray-700/50 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">Stellar Messenger</h1>
            <p className="text-gray-500 text-xs">{totalMessages} messages on-chain</p>
          </div>
        </div>

        {selectedContact && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xs">
                {selectedContact.name[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{selectedContact.name}</p>
              <p className="text-gray-400 text-xs font-mono">{shorten(selectedContact.address)}</p>
            </div>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          contacts={contacts}
          selected={selectedContact}
          onSelect={selectContact}
          onAddContact={() => setShowAddModal(true)}
          userAddress={userAddress}
          onDisconnect={disconnect}
          onCopyAddress={() => {
            navigator.clipboard.writeText(userAddress);
            addToast("Address copied!", "success");
          }}
        />

        {/* Chat panel */}
        <div className="flex-1 flex flex-col bg-gray-900 min-w-0">
          {!selectedContact ? (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-6">
                <div className="w-20 h-20 bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <MessageCircle className="w-10 h-10 text-gray-600" />
                </div>
                <p className="text-gray-300 text-lg font-semibold mb-1">
                  No conversation open
                </p>
                <p className="text-gray-600 text-sm mb-5">
                  Select a contact from the sidebar, or add a new one to start chatting on-chain.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 mx-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 shadow-lg"
                >
                  <Plus className="w-4 h-4" /> Add Contact
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto py-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-600 text-sm">
                      No messages yet — say hello 👋
                    </p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      isSent={m.sender === userAddress}
                    />
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <ChatInput onSend={handleSend} isLoading={isLoading} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}