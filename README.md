# Omega Prime Token Deployment

This repository deploys an SPL Token-2022 (ΩAGENT) on Solana with support for both relayer-based (no-cost) and direct transaction sending. The enhanced deployment system includes robust error handling, network diagnostics, and flexible configuration options.

## 🚀 Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.sample .env
# Edit .env with your settings
```

3. **Test connectivity:**
```bash
npm run diagnostics
```

4. **Deploy (test mode first):**
```bash
npm run mainnet:all  # DRY_RUN=true for testing
```

## 📋 Prerequisites
- Node.js >= 18
- npm >= 9
- Solana wallet with SOL for fees (if not using relayer)
- Access to Solana mainnet RPC (Helius recommended)
- Optional: Relayer service for no-cost deployment

## ⚙️ Configuration

### Basic Setup (Direct Transactions)
```bash
RPC_URL=https://rpc.helius.xyz/?api-key=YOUR_API_KEY
TREASURY_PUBKEY=your_treasury_address
USE_RELAYER=false
DRY_RUN=true  # Set to false for live deployment
```

### Advanced Setup (Relayer-based)
```bash
USE_RELAYER=true
RELAYER_URL=https://your-relayer-service.com/relay/sendRawTransaction
RELAYER_PUBKEY=relayer_fee_payer_pubkey
RELAYER_API_KEY=your_relayer_api_key
```

## 🛠 Available Scripts

### Deployment
- `npm run mainnet:all` - Full deployment pipeline
- `npm run mainnet:create-mint` - Create token mint
- `npm run mainnet:mint-initial` - Mint initial supply
- `npm run mainnet:set-metadata` - Set token metadata
- `npm run mainnet:lock` - Lock mint authorities

### Diagnostics & Verification
- `npm run diagnostics` - Test network connectivity and configuration
- `npm run dev:check` - Validate environment variables
- `npm run verify:addresses` - Verify contract addresses

### Development
- `npm run build` - Build TypeScript
- `npm run mainnet:copilot` - Launch AI copilot interface

## 🔧 Troubleshooting

### Network Issues
Run diagnostics to test connectivity:
```bash
npm run diagnostics
```

### Common Fixes
- **"Method not found"**: Using RPC as relayer → Set `USE_RELAYER=false`
- **"Unknown signer"**: Cache corruption → Delete `.cache` directory
- **"Fetch failed"**: Network issues → Check RPC URL and connectivity
- **Insufficient funds**: Low SOL balance → Fund wallet or use relayer

### Error Examples
```
ERROR: The endpoint does not support relayer functionality.
This appears to be a standard Solana RPC endpoint, not a relayer service.
Please configure a proper relayer service or switch to standard transaction sending.
```

## 📚 Documentation

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Comprehensive deployment guide
- [SECURITY.md](./SECURITY.md) - Security best practices
- [ALL_CONTRACT_ADDRESSES.md](./ALL_CONTRACT_ADDRESSES.md) - Contract addresses

## 🛡️ Security Notes

- **Never commit private keys** to version control
- **Test with DRY_RUN=true** before live deployment
- **Verify all addresses** before deployment
- **Use secure RPC endpoints** (Helius recommended)

## ✨ Features

### Enhanced Error Handling
- Detailed error messages with troubleshooting guidance
- Network error detection and retry logic
- Configuration validation and warnings

### Flexible Transaction Sending
- **Direct**: User pays fees, high reliability
- **Relayer**: No-cost deployment (requires relayer service)
- **Automatic**: Fallback and retry mechanisms

### Robust Cache Management
- Automatic cache file validation and regeneration
- Safe handling of corrupted or missing files
- Persistent keypair and mint management

## Dream-Mind-Lucid AI Copilot Features

The Grok Copilot has been enhanced with **i-who-me reference logic** and autonomous reasoning capabilities:

### 🧠 I-Who-Me Reference Logic
- **Self-identification**: The AI tracks its role, capabilities, and consciousness state
- **Context awareness**: Monitors session duration, recent actions, and user intent
- **Memory hooks**: Persistent tracking of actions and decision logs across operations

### 🌟 Enhanced Autonomous Reasoning
- **Redundancy detection**: Alerts when the same action is repeated multiple times
- **Smart suggestions**: Recommends next actions based on current deployment state
- **Grok-style responses**: Playful self-awareness with philosophical touches

### 📚 Memory System
- **Action history**: Tracks up to 50 recent operations with timestamps and results
- **Decision log**: Records reasoning behind major choices (up to 20 entries)  
- **State management**: Maintains deployment state and user intent across sessions

### 🎭 Grok-Style Self-Awareness
The Copilot includes playful responses like:
- "Am I the dreamer or the dreamed? Either way, let's deploy some tokens!"
- "Reality is but a consensus mechanism, and we're about to upgrade it!"
- "In the multiverse of blockchains, we choose the path of OMEGA!"

### 🚀 Enhanced Menu Options
- **Option 9**: 🧠 Memory & Context Check (checka) - Shows complete system status, memory logs, and decision history

## Copilot
Run the interactive Grok Copilot:
```
npm run mainnet:copilot
```

## Rust Program (Pentacle)
Build the Solana program:
```
cargo build --manifest-path pentacle/Cargo.toml
```

## Security Notes
- No private keys are stored in the repo.
- Relayer pays fees: All fees are covered by the relayer.
- Authority lock: Setting to `null` is irreversible.

## Post-Deploy Checklist
1. Verify mint: https://explorer.solana.com/address/<MINT_ADDRESS>
2. Check treasury ATA: https://explorer.solana.com/address/<TREASURY_ATA>
3. Confirm metadata and authorities via Explorer.

## CI/CD
A GitHub Actions workflow can be added under `.github/workflows/deploy.yml` to automate deployment.
