# Omega Prime Token Deployment Guide

## Overview

This repository provides a complete deployment pipeline for the Omega Prime Token (ΩAGENT) on Solana. The system supports both relayer-based (no-cost) and direct transaction sending.

## Recent Updates

### ✅ Fixed Issues
- **Relayer Configuration**: Fixed incorrect Helius RPC usage as relayer service
- **Error Logging**: Improved error handling with detailed logging
- **Signer Errors**: Fixed cache file handling and keypair management
- **Environment Configuration**: Updated for proper Helius RPC usage
- **Transaction Sending**: Added support for both relayer and direct transaction methods

### 🆕 New Features
- **Flexible Transaction Sending**: Choose between relayer (no-cost) or direct (user pays fees)
- **Better Error Messages**: Clear error descriptions and troubleshooting guidance
- **Improved Cache Management**: Robust handling of cache files and keypairs
- **Environment Validation**: Enhanced security and configuration checks

## Quick Start

### 1. Environment Setup

Copy and configure your environment:

```bash
cp .env.sample .env
# Edit .env with your settings
```

### 2. Test in DRY_RUN Mode

```bash
# Test the full deployment pipeline safely
npm run mainnet:all
```

### 3. Live Deployment

```bash
# Set DRY_RUN=false in .env for live deployment
npm run mainnet:all
```

## Environment Configuration

### Required Variables

```bash
# Solana RPC (using Helius for better reliability)
RPC_URL=https://rpc.helius.xyz/?api-key=YOUR_API_KEY
HELIUS_API_KEY=your_helius_api_key

# Transaction Method
USE_RELAYER=false  # Set to true for relayer-based deployment

# Wallet Configuration
TREASURY_PUBKEY=your_treasury_address
TARGET_WALLET_ADDRESS=your_target_address

# Security Settings
DRY_RUN=true  # Set to false for live deployment
```

### Relayer Configuration (Optional)

For no-cost deployment, configure a real relayer service:

```bash
USE_RELAYER=true
RELAYER_URL=https://your-relayer-service.com/relay/sendRawTransaction
RELAYER_PUBKEY=relayer_fee_payer_pubkey
RELAYER_API_KEY=your_relayer_api_key
```

## Deployment Methods

### Method 1: Direct Transaction Sending (Recommended)

- **Cost**: You pay SOL transaction fees
- **Reliability**: Direct to Solana network
- **Configuration**: Set `USE_RELAYER=false`

```bash
USE_RELAYER=false
DRY_RUN=false
```

### Method 2: Relayer-Based (No-Cost)

- **Cost**: Relayer pays fees
- **Requirements**: Real relayer service (not Helius RPC)
- **Configuration**: Set `USE_RELAYER=true` with valid relayer

```bash
USE_RELAYER=true
RELAYER_URL=https://your-relayer-service.com/relay/sendRawTransaction
RELAYER_PUBKEY=relayer_public_key
```

## Scripts Overview

### Individual Scripts

```bash
npm run mainnet:create-mint     # Create the token mint
npm run mainnet:mint-initial    # Mint initial supply to treasury
npm run mainnet:set-metadata    # Set token metadata
npm run mainnet:lock           # Lock mint authorities
```

### Full Pipeline

```bash
npm run mainnet:all  # Run all deployment steps
```

### Verification

```bash
npm run verify:addresses  # Verify contract addresses
npm run validate:copilot  # Validate AI copilot features
```

## Troubleshooting

### Common Issues

1. **"Method not found" error**
   - **Cause**: Using Helius RPC as relayer
   - **Fix**: Set `USE_RELAYER=false` or configure real relayer

2. **"Unknown signer" error**
   - **Cause**: Cache file corruption or keypair mismatch
   - **Fix**: Delete `.cache` directory and regenerate

3. **Transaction fees**
   - **Cause**: Insufficient SOL in wallet
   - **Fix**: Fund your wallet or use relayer service

4. **Network errors**
   - **Cause**: RPC connectivity issues
   - **Fix**: Check RPC URL and API key

### Error Messages

The system provides detailed error messages with troubleshooting guidance:

```
❌ Relayer failed after 3 attempts: Method not found
ERROR: The endpoint does not support relayer functionality.
This appears to be a standard Solana RPC endpoint, not a relayer service.
Please configure a proper relayer service or switch to standard transaction sending.
```

## Security Notes

- **Never commit real private keys** to version control
- **Use DRY_RUN=true** for testing before live deployment
- **Verify all addresses** before live deployment
- **Keep API keys secure** and rotate them regularly

## Support

For issues or questions:
1. Check the error messages and troubleshooting section
2. Review the environment configuration
3. Test in DRY_RUN mode first
4. Verify your RPC and relayer settings

## Architecture

The deployment system uses:
- **TypeScript** for type safety
- **Solana Web3.js** for blockchain interactions
- **Metaplex UMI** for token metadata
- **SPL Token-2022** for enhanced token features
- **Flexible transaction sending** for reliability