# 🌟 Stellar Messenger

**Decentralized · Encrypted · Peer-to-Peer Messaging on the Stellar Blockchain**

> A fully decentralized messaging application built on the Stellar network using Soroban smart contracts. Messages are AES-encrypted client-side and stored permanently on-chain — no servers, no surveillance, no censorship.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Smart Contract Setup](#smart-contract-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
  - [Freighter Wallet Mode](#freighter-wallet-mode)
  - [Demo Mode (Secret Key)](#demo-mode-secret-key)
- [Smart Contract API](#smart-contract-api)
- [Current Status](#current-status)
- [Future Scope](#future-scope)
- [License](#license)

---

## Overview

Stellar Messenger is a blockchain-based encrypted peer-to-peer messaging application. It leverages **Soroban smart contracts** on the Stellar Testnet to store messages immutably on-chain with end-to-end AES encryption. Users maintain complete ownership of their communication data — no centralized server ever touches the message content.

**Key Principles:**
- 🔒 **Privacy First** — Messages are AES-encrypted before leaving your device
- 🌐 **On-Chain Storage** — All messages live permanently on the Stellar blockchain
- 🛡️ **No Servers** — Fully peer-to-peer, no intermediaries
- 🚫 **Censorship Resistant** — No central authority can block or delete messages

---

## Features

| Feature | Description |
|---|---|
| **Encrypted Messaging** | AES client-side encryption — only sender & receiver can read content |
| **Freighter Wallet Login** | Connect via the Freighter browser extension |
| **Demo / Secret Key Mode** | Sign transactions directly with a testnet secret key — no extension needed |
| **Contact Management** | Add contacts by name + Stellar address; persisted in `localStorage` |
| **Read Receipts** | Double-tick indicators; receivers auto-mark messages as read on-chain |
| **Real-Time Polling** | New messages detected every 5 seconds via RPC message-count polling |
| **On-Chain Message Counter** | Global message count visible in the app header |
| **Responsive Chat UI** | Dark glassmorphism UI built with React + TailwindCSS |

---

## Tech Stack

### Smart Contract (Backend)
| Technology | Version | Purpose |
|---|---|---|
| Rust | stable | Smart contract language |
| Soroban SDK | 23.0.2 | Stellar smart contract framework |
| Cargo | latest | Build toolchain |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.2 | UI framework |
| Vite | 4.4 | Build tool & dev server |
| TailwindCSS | 3.3 | Utility-first styling |
| `@stellar/stellar-sdk` | 12.3 | Stellar RPC, transaction building |
| `@stellar/freighter-api` | 5.0 | Freighter wallet integration |
| `crypto-js` | 4.2 | AES message encryption |
| `lucide-react` | 0.263 | Icon library |

---

## Project Structure

```
Decentralised-Messaging-App-using-Stellar-Blockchain/
│
├── contracts/
│   └── messaging-contract/       # Soroban smart contract (Rust)
│       ├── src/
│       │   └── lib.rs            # Contract logic: send, read, mark-as-read
│       └── Cargo.toml
│
├── frontend/                     # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx               # Main app component & state management
│   │   ├── services/
│   │   │   └── freighter.service.js  # Freighter wallet connector
│   │   └── utils/
│   │       ├── soroban.js        # Soroban RPC calls & transaction builder
│   │       └── encryption.js     # AES encrypt / decrypt helpers
│   ├── .env                      # Your local environment config (gitignored)
│   ├── .env.example              # Environment variable template
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── deploy_contract.js            # Node.js deployment helper script
├── Cargo.toml                    # Workspace Cargo config
└── README.md
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                    │
│                                                     │
│   ┌──────────────┐    ┌──────────────────────────┐  │
│   │ Freighter    │    │  Demo Mode (Secret Key)  │  │
│   │ Extension    │    │  Direct Keypair Signing  │  │
│   └──────┬───────┘    └──────────┬───────────────┘  │
│          │                       │                  │
│          └──────────┬────────────┘                  │
│                     ▼                               │
│          ┌──────────────────────┐                   │
│          │  soroban.js          │                   │
│          │  - AES encrypt/dec   │                   │
│          │  - Build Soroban Tx  │                   │
│          │  - Sign & Submit     │                   │
│          └──────────┬───────────┘                   │
└─────────────────────┼───────────────────────────────┘
                      │ HTTPS / RPC
                      ▼
         ┌─────────────────────────┐
         │  Soroban RPC Server     │
         │  soroban-testnet.       │
         │  stellar.org            │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │  Soroban Smart Contract │
         │  (Rust / WASM)          │
         │                         │
         │  send_message()         │
         │  get_message()          │
         │  mark_as_read()         │
         │  get_message_count()    │
         └─────────────────────────┘
```

**Message Flow:**
1. User types a message → encrypted client-side with AES
2. Encrypted content passed to `sendMessage()` in `soroban.js`
3. A Soroban transaction is built, simulated, signed (Freighter or secret key), and submitted
4. On-chain: the contract stores `{ sender, receiver, encrypted_content, timestamp, is_read }`
5. Recipient's client polls every 5s, fetches new messages, and decrypts locally

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 9
- **Rust** (stable) + **Cargo**
- **Soroban CLI** — install with:
  ```bash
  cargo install --locked stellar-cli --features opt
  ```
- **Freighter Browser Extension** (optional, for wallet mode)
- Two funded Stellar **Testnet** accounts — get free XLM from [Stellar Friendbot](https://friendbot.stellar.org)

---

### Smart Contract Setup

```bash
# 1. Clone the repository
git clone https://github.com/pisemegh/Decentralised-Messaging-App-using-Stellar-Blockchain.git
cd Decentralised-Messaging-App-using-Stellar-Blockchain

# 2. Build the smart contract (WASM)
cargo build --target wasm32-unknown-unknown --release

# 3. Deploy to Stellar Testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/messaging_contract.wasm \
  --source <YOUR_SECRET_KEY> \
  --network testnet

# This prints your CONTRACT_ID — save it!
```

---

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Then edit .env and set your CONTRACT_ID (see below)

# 4. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Variables

Copy `frontend/.env.example` to `frontend/.env` and fill in your values:

```env
# REQUIRED — Your deployed Soroban contract address
VITE_CONTRACT_ID=C...your_contract_id_here...

# OPTIONAL — Override RPC endpoint (defaults to Stellar Testnet)
VITE_RPC_URL=https://soroban-testnet.stellar.org

# OPTIONAL — Network passphrase (defaults to Testnet)
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

## Usage

### Freighter Wallet Mode

1. Install the [Freighter browser extension](https://www.freighter.app/)
2. Create or import a Stellar Testnet account in Freighter
3. Fund it via [Friendbot](https://friendbot.stellar.org/?addr=YOUR_ADDRESS)
4. Click **"Connect Freighter Wallet"** on the welcome screen
5. Add a contact using their Stellar address (starts with `G`)
6. Start messaging — Freighter will prompt you to sign each transaction

### Demo Mode (Secret Key)

For quick testing without the Freighter extension:

1. Click **"Use Secret Key (Demo)"** on the welcome screen
2. Enter your Testnet secret key (starts with `S`, 56 characters)
3. Transactions are signed directly in-browser — **use testnet keys only!**

---

## Smart Contract API

The Soroban contract exposes the following functions:

| Function | Parameters | Description |
|---|---|---|
| `send_message` | `sender: Address, receiver: Address, encrypted_content: String` | Stores an encrypted message on-chain; returns the new `msg_id` (u64) |
| `get_message` | `msg_id: u64, caller: Address` | Returns message struct; only accessible by sender or receiver |
| `mark_as_read` | `msg_id: u64, receiver: Address` | Marks a message as read; only callable by the receiver |
| `get_message_count` | _(none)_ | Returns the total number of messages sent through the contract |

**Message struct stored on-chain:**
```rust
pub struct Message {
    pub msg_id: u64,
    pub sender: Address,
    pub receiver: Address,
    pub encrypted_content: String,  // AES-encrypted, base64-encoded
    pub timestamp: u64,             // Unix timestamp in ms
    pub is_read: bool,
}
```

---

## Current Status

| Layer | Description | Status |
|---|---|---|
| **Smart Contract** | Message creation, retrieval, and read-status management | ✅ Deployed on Testnet |
| **Frontend (React + Vite)** | Wallet connection, AES encryption, chat UI | ✅ Functional |
| **Freighter Integration** | Wallet connection and transaction signing | ✅ Working |
| **Demo / Secret Key Mode** | Direct keypair signing for demos without extension | ✅ Working |
| **Real-Time Polling** | New message detection via RPC message-count diff | ✅ Working (5s interval) |
| **Soroban RPC Read Flow** | Direct ledger-entry reads (bypasses `require_auth`) | ✅ Working |

---

## Future Scope

### Short-Term (3–6 months)
- Message deletion by sender/receiver
- Pagination / bulk message retrieval
- Filter messages by date or read status
- Message forwarding

### Medium-Term (6–12 months)
- Group chat with multi-party encryption
- Encrypted file/media attachments
- On-chain contact list management
- Event-based push notifications
- Full-text search (privacy-preserving)

### Long-Term (1–2 years)
- Cross-chain messaging (Stellar ↔ other networks)
- Decentralized Identity (DID) integration
- Peer-to-peer encrypted voice/video
- IPFS/Arweave integration for large attachments
- Native mobile and desktop apps
- Governance token for community-driven development
- Self-destructing / expiring messages

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is licensed under the **MIT License**.

---

<div align="center">
  <strong>Built with ❤️ on Stellar using Soroban</strong><br/>
  <a href="https://stellar.org">stellar.org</a> · <a href="https://soroban.stellar.org">soroban.stellar.org</a>
</div>
