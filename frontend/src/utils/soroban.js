// -----------------------------------------------------
// 🌟 Soroban Integration — supports Freighter + Demo Mode
// -----------------------------------------------------

// Polyfill Buffer for browser (stellar-sdk needs it)
import { Buffer } from "buffer";
if (!window.Buffer) window.Buffer = Buffer;

// New 2024+ Stellar SDK with RPC + Soroban in one package
import {
  Address,
  Contract,
  Keypair,
  Transaction,
  TransactionBuilder,
  BASE_FEE,
  Networks,
  rpc,
  nativeToScVal,
  scValToNative,
  xdr,             // 👈 we’ll use this to read contract storage directly
  authorizeEntry,
} from "@stellar/stellar-sdk";

import {
  getAddress as freighterGetAddress,
  signTransaction as freighterSignTx,
  isConnected as freighterIsConnected,
  setAllowed as freighterSetAllowed,
} from "@stellar/freighter-api";

// -----------------------------------------------------
// ⚙️ Environment Config (SAFE VERSION)
// -----------------------------------------------------

const RPC_URL =
  import.meta.env.VITE_RPC_URL || "https://soroban-testnet.stellar.org";

const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE ||
  "Test SDF Network ; September 2015";

// 🔍 DEBUG LOGS (keep this for now)
console.log("ENV CONTRACT ID:", import.meta.env.VITE_CONTRACT_ID);
console.log("ENV RPC URL:", RPC_URL);
console.log("ENV NETWORK:", NETWORK_PASSPHRASE);

// 🧠 SAFE CONTRACT ID HANDLING
const CONTRACT_ID_RAW = import.meta.env.VITE_CONTRACT_ID;

if (!CONTRACT_ID_RAW || CONTRACT_ID_RAW.trim() === "") {
  throw new Error(
    "🚨 Contract ID is missing! Check your .env file and restart the server."
  );
}

const CONTRACT_ID = CONTRACT_ID_RAW.trim();

// -----------------------------------------------------
// 🔗 Soroban Server & Contract Setup
// -----------------------------------------------------

const server = new rpc.Server(RPC_URL, { allowHttp: false });

// ✅ SAFE contract creation
let contract;

try {
  contract = new Contract(CONTRACT_ID);
  console.log("✅ Contract initialized:", CONTRACT_ID);
} catch (err) {
  console.error("❌ Invalid Contract ID:", CONTRACT_ID);
  throw err;
}
// 🪪 Freighter Wallet Utilities
// -----------------------------------------------------
export async function getPublicKey() {
  const connected = await freighterIsConnected();
  if (!connected || connected.isConnected !== true) {
    const allowed = await freighterSetAllowed();
    if (!allowed || allowed.isAllowed !== true) {
      throw new Error("Freighter not allowed or user denied access.");
    }
  }

  const pk = await freighterGetAddress();
  if (!pk || typeof pk !== "string") {
    throw new Error("Freighter wallet not connected or returned invalid address.");
  }
  return pk;
}

// -----------------------------------------------------
// 🧩 Helpers
// -----------------------------------------------------
async function loadAccount(publicKey) {
  return server.getAccount(publicKey);
}
const toAddr = (pubKey) => Address.fromString(pubKey).toScVal();
const u64 = (n) => nativeToScVal(n, { type: "u64" });
const sstr = (s) => nativeToScVal(s, { type: "string" });

// -----------------------------------------------------
// 🔑 Demo Mode — sign with secret key directly (no Freighter)
// -----------------------------------------------------
let _demoKeypair = null;

export function setDemoKeypair(secretKey) {
  _demoKeypair = Keypair.fromSecret(secretKey);
}

export function getDemoPublicKey() {
  return _demoKeypair?.publicKey() ?? null;
}

export function clearDemoKeypair() {
  _demoKeypair = null;
}

// Build -> prepare. Returns a Transaction object (stellar-sdk v12)
async function prepareInvokeTx(sourceAccount, op) {
  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  // server.prepareTransaction returns a Transaction object in sdk v12
  return await server.prepareTransaction(tx);
}

// Sign with demo keypair OR Freighter
async function signTx(preparedTx) {
  if (_demoKeypair) {
    // Sign Soroban auth entries first (required by require_auth() in the contract)
    try {
      const latest = await server.getLatestLedger();
      const validUntil = latest.sequence + 100;
      for (const op of preparedTx.operations) {
        if (op.auth && op.auth.length > 0) {
          op.auth = await Promise.all(
            op.auth.map((entry) =>
              authorizeEntry(entry, _demoKeypair, validUntil, NETWORK_PASSPHRASE)
            )
          );
        }
      }
    } catch (e) {
      console.warn("Soroban auth signing skipped:", e.message);
    }
    // Sign the transaction envelope
    preparedTx.sign(_demoKeypair);
    return preparedTx;
  }
  // Freighter mode: convert to XDR string
  let xdrString;
  try {
    xdrString = preparedTx.toEnvelope().toXDR("base64");
  } catch {
    xdrString = preparedTx;
  }
  const { signedTxXdr, error } = await freighterSignTx(xdrString, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  if (error) throw new Error(error?.message || "Freighter signing failed");
  return signedTxXdr;
}

// Submit and poll result — accepts Transaction object or XDR string
async function submitAndWait(signedTx) {
  const sendRes = await server.sendTransaction(signedTx);
  const { hash } = sendRes;
  for (;;) {
    const res = await server.getTransaction(hash);
    if (res.status === "SUCCESS") return res;
    if (res.status === "FAILED") throw new Error("Transaction failed on-chain");
    await new Promise((r) => setTimeout(r, 1000));
  }
}

// -----------------------------------------------------
// 🧠 READ HELPERS (NO AUTH): Read storage with getLedgerEntries
// -----------------------------------------------------
// Storage layout from your Rust:
// - MSG_COUNT stored under symbol "MSG_CNT"
// - messages under enum key ["Message", msg_id]
// We’ll fetch these directly from ledger without calling `get_message`
// to avoid require_auth traps during simulation.

async function readContractData(scKey) {
  const ledgerKey = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: Address.fromString(CONTRACT_ID).toScAddress(),
      key: scKey,
      durability: xdr.ContractDataDurability.instance(),
    })
  );
  const ledgerKeyXDR = ledgerKey.toXDR("base64");
  const response = await server.getLedgerEntries([ledgerKeyXDR]);
  const entry = response?.entries?.[0];
  return entry?.val ?? null; // returns ScVal or null
}

// -----------------------------------------------------
// ✉️ SEND MESSAGE (on-chain write)
// -----------------------------------------------------
export async function sendMessage(senderPubKey, receiverPubKey, encryptedContent) {
  const account = await loadAccount(senderPubKey);

  const op = contract.call(
    "send_message",
    toAddr(senderPubKey),
    toAddr(receiverPubKey),
    sstr(encryptedContent)
  );

  const preparedXdr = await prepareInvokeTx(account, op);
  const signedXdr = await signTx(preparedXdr);
  const res = await submitAndWait(signedXdr);

  // parse return value (u64 id) from resultXdr
  const scVal = rpc.Api.deserializeResultXdr(res.resultXdr);
  const msgId = scValToNative(scVal);

  return { hash: res.hash, msgId };
}

// -----------------------------------------------------
// 📊 GET TOTAL MESSAGE COUNT (read-only, no auth)
// -----------------------------------------------------
export async function getMessageCount() {
  try {
    const scKey = nativeToScVal("MSG_CNT", { type: "symbol" });
    const scVal = await readContractData(scKey);
    if (!scVal) return 0;
    return scValToNative(scVal); // u64 -> number
  } catch (err) {
    console.error("getMessageCount failed:", err);
    return 0;
  }
}

// -----------------------------------------------------
// 📩 GET A SPECIFIC MESSAGE BY ID (read-only, no auth)
// -----------------------------------------------------
export async function getMessage(msgId /*, userPubKey unused for read */) {
  try {
    const scKey = nativeToScVal(["Message", Number(msgId)]);
    const scVal = await readContractData(scKey);
    if (!scVal) return null;
    return scValToNative(scVal); // { msg_id, sender, receiver, encrypted_content, timestamp, is_read }
  } catch (err) {
    console.error("getMessage failed:", err);
    return null;
  }
}

// -----------------------------------------------------
// ✅ MARK MESSAGE AS READ (on-chain write)
// -----------------------------------------------------
export async function markAsRead(msgId, receiverPubKey) {
  const account = await loadAccount(receiverPubKey);
  const op = contract.call("mark_as_read", u64(msgId), toAddr(receiverPubKey));
  const preparedXdr = await prepareInvokeTx(account, op);
  const signedXdr = await signTx(preparedXdr);
  const res = await submitAndWait(signedXdr);
  return { hash: res.hash };
}

// -----------------------------------------------------
// 🔁 FETCH CONVERSATION BETWEEN TWO USERS (iterate storage)
// -----------------------------------------------------
export async function fetchConversation(aPubKey, bPubKey) {
  const total = await getMessageCount();
  const out = [];
  for (let i = 1; i <= total; i++) {
    try {
      const m = await getMessage(i);
      if (!m) continue;

      // Sender/receiver come back as Address — normalize to string
      const sender =
        typeof m.sender === "string" ? m.sender : m.sender?.toString?.() ?? String(m.sender);
      const receiver =
        typeof m.receiver === "string" ? m.receiver : m.receiver?.toString?.() ?? String(m.receiver);

      if (
        (sender === aPubKey && receiver === bPubKey) ||
        (sender === bPubKey && receiver === aPubKey)
      ) {
        out.push({ id: i, ...m });
      }
    } catch (e) {
      console.warn("Skipping message", i, e);
    }
  }
  return out;
}