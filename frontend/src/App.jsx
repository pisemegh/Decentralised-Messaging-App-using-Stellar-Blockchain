// ------------------------------------------------------------
// 🌟 Stellar Messenger DApp
// Chat between two Freighter wallets (Niharika ↔ Isha)
// ------------------------------------------------------------
import React, { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Send,
  Check,
  CheckCheck,
  User,
  LogOut,
  Loader2,
} from "lucide-react";
import { encrypt, decrypt } from "./utils/encryption";
import {
  sendMessage,
  getMessageCount,
  markAsRead,
  fetchConversation,
} from "./utils/soroban";
import { connectFreighter } from "./services/freighter.service";

// ------------------------------------------------------------
// 🧱 REAL ACCOUNTS
// Replace these with your live Freighter public keys
// ------------------------------------------------------------
const REAL = {
  niharika: "GA5FA5JJ6TYKRENTB5NN7K5MLB436IJQVJWCCTLYN76R7RWHJDKCXRL6", // Brave
  isha: "GC6VLVS3HIJWVNACGDDLWARQZA4YIKYB2M6MUZWKBQ3U6BGEXZLLZN5Q", // Chrome
};

// Dummy local-only contacts (for sidebar testing)
const DUMMY_CONTACTS = [
  { name: "Alice", address: null },
  { name: "Bob", address: null },
  { name: "Charlie", address: null },
];

// Helper to shorten Stellar addresses
const shorten = (a) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "");

// ============================================================
// 🧩 Header Bar — shows wallet + selected contact
// ============================================================
const HeaderBar = ({ receiver, total, user, onDisconnect }) => (
  <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
        <User className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className="text-white font-semibold">{receiver?.name || "Select contact"}</h2>
        <p className="text-gray-400 text-sm">
          {receiver?.address ? shorten(receiver.address) : "Local chat"}
        </p>
        <p className="text-gray-400 text-xs">Total messages: {total}</p>
      </div>
    </div>

    {user && (
      <div className="text-right">
        <p className="text-xs text-gray-400">Connected</p>
        <p className="text-sm text-white font-mono">{shorten(user)}</p>
        <button
          onClick={onDisconnect}
          className="ml-3 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
        >
          <LogOut className="w-4 h-4 text-gray-300" />
        </button>
      </div>
    )}
  </div>
);

// ============================================================
// 💬 Message Bubble Component
// ============================================================
const MessageBubble = ({ message, isSent }) => {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className={`flex ${isSent ? "justify-end" : "justify-start"} mb-3 px-6`}>
      <div
        className={`max-w-md rounded-2xl px-4 py-2 ${
          isSent
            ? "bg-pink-500 text-white rounded-br-none"
            : "bg-gray-700 text-white rounded-bl-none"
        }`}
      >
        <p className="break-words">{message.content}</p>
        <div className="flex items-center justify-end gap-1 mt-1 text-xs opacity-70">
          <span>{time}</span>
          {isSent &&
            (message.isRead ? (
              <CheckCheck className="w-4 h-4 text-blue-300" />
            ) : (
              <Check className="w-4 h-4" />
            ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 📝 Chat Input Box
// ============================================================
const ChatInput = ({ onSend, isLoading, disabled }) => {
  const [msg, setMsg] = useState("");

  const sendNow = () => {
    if (msg.trim() && !isLoading && !disabled) {
      onSend(msg.trim());
      setMsg("");
    }
  };

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-6 py-3 flex items-center gap-3">
      <input
        className="flex-1 bg-gray-700 text-white rounded-full px-6 py-3 focus:ring-2 focus:ring-pink-500 outline-none"
        placeholder={disabled ? "Connect wallet & select a contact" : "Type a message..."}
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendNow()}
        disabled={disabled}
      />
      <button
        className="bg-pink-500 hover:bg-pink-600 text-white rounded-full p-3 disabled:bg-gray-600"
        disabled={!msg.trim() || isLoading || disabled}
        onClick={sendNow}
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
      </button>
    </div>
  );
};

// ============================================================
// 📇 Contact Sidebar Component
// ============================================================
const ContactList = ({ realContact, onSelect, selected, isConnected }) => {
  const all = [realContact, ...DUMMY_CONTACTS].filter(Boolean);
  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="px-6 py-4 border-b border-gray-700">
        <h2 className="text-white font-semibold text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Contacts
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!isConnected ? (
          <div className="p-6 text-center text-gray-400">
            Connect your wallet
          </div>
        ) : (
          all.map((c, idx) => {
            const isSelected = selected?.name === c.name;
            return (
              <button
                key={idx + c.name}
                onClick={() => onSelect(c)}
                className={`w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-700 transition-colors border-b border-gray-700 ${
                  isSelected ? "bg-gray-700" : ""
                }`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-medium">{c.name}</p>
                  <p className="text-gray-400 text-sm font-mono">
                    {c.address ? shorten(c.address) : "Local only"}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// ============================================================
// 🚀 MAIN APP COMPONENT
// ============================================================
export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [realContact, setRealContact] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const chatEndRef = useRef(null);

  // 🔌 Connect Wallet
  const connectWallet = async () => {
    try {
      const { address } = await connectFreighter();
      setUserAddress(address);
      setIsConnected(true);

      const other =
        address === REAL.niharika
          ? { name: "Isha", address: REAL.isha }
          : { name: "Niharika", address: REAL.niharika };

      setRealContact(other);
      setSelectedContact(other);

      await refreshCounts();
      await loadConversation(address, other.address);
    } catch (e) {
      alert(e.message || "Freighter connection failed");
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setUserAddress("");
    setSelectedContact(null);
    setMessages([]);
  };

  // 🔄 Refresh count
  const refreshCounts = async () => {
    try {
      const c = await getMessageCount();
      setTotalMessages(c);
    } catch (e) {
      console.error("getMessageCount failed:", e);
    }
  };

  // 📦 Load blockchain messages between 2 users
  const loadConversation = async (me, otherAddr) => {
    try {
      const msgs = await fetchConversation(me, otherAddr);
      const uiMsgs = msgs.map((m) => ({
        id: m.msg_id,
        sender: m.sender,
        receiver: m.receiver,
        content: decrypt(m.encrypted_content),
        timestamp: m.timestamp,
        isRead: m.is_read,
      }));
      setMessages(uiMsgs);
    } catch (e) {
      console.error("loadConversation error:", e);
    }
  };

  // 📨 Send new message
  const handleSend = async (text) => {
    if (!selectedContact) return;
    setIsLoading(true);
    try {
      const encrypted = encrypt(text);
      const res = await sendMessage(userAddress, selectedContact.address, encrypted);

      setMessages((prev) => [
        ...prev,
        {
          id: res.id || Date.now(),
          sender: userAddress,
          receiver: selectedContact.address,
          content: text,
          timestamp: Date.now(),
          isRead: false,
        },
      ]);

      await refreshCounts();
    } catch (e) {
      console.error("sendMessage failed:", e);
      alert("Send failed: " + (e.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ========================================================
  // UI Layout
  // ========================================================
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {!isConnected ? (
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 flex justify-between items-center">
          <p className="text-white font-medium">
            Connect your Freighter wallet to start chatting
          </p>
          <button
            onClick={connectWallet}
            className="bg-white text-pink-600 px-6 py-2 rounded-full font-semibold hover:bg-gray-100"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <HeaderBar
          receiver={selectedContact}
          total={totalMessages}
          user={userAddress}
          onDisconnect={disconnect}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        <ContactList
          realContact={realContact}
          selected={selectedContact}
          onSelect={setSelectedContact}
          isConnected={isConnected}
        />

        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto bg-gray-900">
            {!selectedContact ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-lg">
                Select a contact to start chatting
              </div>
            ) : (
              <div className="py-6">
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isSent={m.sender === userAddress}
                  />
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
            disabled={!isConnected || !selectedContact}
          />
        </div>
      </div>
    </div>
  );
}