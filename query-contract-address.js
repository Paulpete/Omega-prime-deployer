// Example: Query a Solana contract address using Node.js and @solana/web3.js
// This script fetches account info for a contract address (e.g., BOT1 contract)

const { Connection, PublicKey } = require('@solana/web3.js');

// Use your preferred Solana RPC endpoint
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

// Example contract address (BOT1 - Stake Master)
const CONTRACT_ADDRESS = 'EAy5Nfn6fhs4ixC4sMcKQYQaoedLokpWqbfDtWURCnk6';

async function main() {
  try {
    const pubkey = new PublicKey(CONTRACT_ADDRESS);
    const accountInfo = await connection.getAccountInfo(pubkey);
    if (accountInfo) {
      console.log('Account data (base64):', accountInfo.data.toString('base64'));
      console.log('Lamports:', accountInfo.lamports);
      console.log('Owner:', accountInfo.owner.toBase58());
      console.log('Executable:', accountInfo.executable);
    } else {
      console.log('No account found for this address.');
    }
  } catch (err) {
    console.error('Error fetching contract info:', err);
  }
}

main();
