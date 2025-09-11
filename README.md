# Stunning Solana: Omega Prime Token Deployment

This repository deploys an SPL Token-2022 (ΩAGENT) on Solana mainnet-beta with zero SOL cost using a relayer. The `grok-copilot.ts` script handles all deployment steps interactively.

## Prerequisites
- Node.js >= 18
- npm >= 9
- A funded relayer (RELAYER_PUBKEY, RELAYER_URL)
- A treasury public key (TREASURY_PUBKEY)
- Optional: DAO multisig public key (DAO_PUBKEY)
- Access to a Solana mainnet-beta RPC

## Setup
1. Clone the repo:
```
git clone https://github.com/imfromfuture3000-Android/Omega-prime-deployer.git
cd Omega-prime-deployer
```
2. Install dependencies:
```
npm install
```
3. Copy `.env.sample` to `.env` and fill in:
```
cp .env.sample .env
```
Edit `.env`:
```
RPC_URL=https://api.mainnet-beta.solana.com
RELAYER_URL=https://<your-relayer-domain>/relay/sendRawTransaction
RELAYER_PUBKEY=<RELAYER_FEE_PAYER_PUBKEY>
TREASURY_PUBKEY=<YOUR_TREASURY_PUBKEY>
DAO_PUBKEY=<YOUR_DAO_MULTISIG_PUBKEY> # Optional
AUTHORITY_MODE=null # Options: null, dao, treasury
DRY_RUN=false
RELAYER_API_KEY=<YOUR_API_KEY> # Optional
```

## One-Command Deployment
```
npm run mainnet:all
```


## Copilot: Dream-Mind-Lucid AI (with i-who-me Reference & Memory)
Run the interactive Grok Copilot:
```
npm run mainnet:copilot
```

### 🧠 Copilot Self-Awareness & Memory
- **i-who-me reference logic**: Copilot tracks its own actions, context, and user intent.
- **Memory hooks**: Recent actions and decision logs are stored in memory (see `grok-copilot.ts`).
- **Redundancy detection**: Copilot warns if you repeat an action or enter a loop.
- **Self-checks**: Playful Grok-style responses ("Am I the dreamer or the dreamed?") appear during operation.
- **Decision log**: Copilot logs all major decisions and actions for transparency.

### Example Self-Check Output
```
🤖 [Copilot Self-Check]: Am I the dreamer or the dreamed?
	Context: Last action = createTokenMint, User intent = 2
```

See the top of `grok-copilot.ts` for the CopilotMemory and i-who-me logic implementation.

## 🔍 Deployment Control Analysis

### What Deployments Do We Control?
**Answer: Currently NO existing deployments are under our control.**

Check deployment control with:
```bash
npm run analyze:control-simple  # Offline analysis
npm run analyze:control         # Full online analysis (requires network)
```

**Key Findings:**
- ✅ We have 1 deployment keypair: `76x25b6XWTwbm6MTBJtbFU1hFopBSDKsfmGC7MK929RX`
- ❌ Master Controller (`CvQZZ23...tipQ`) - NOT CONTROLLED
- ❌ All 5 bot contracts - NOT CONTROLLED
- ❌ Treasury operations - NOT CONTROLLED

**What we CAN do:**
- Deploy NEW contracts with current keypairs
- Create new token mints
- Act as upgrade authority for NEW deployments

**What we CANNOT do:**
- Control existing bot army contracts
- Access master controller functions
- Manage existing treasury operations

See `DEPLOYMENT_CONTROL_REPORT.md` for detailed analysis.

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
