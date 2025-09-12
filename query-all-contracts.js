// Query all contract addresses for account info, recent transactions, and mint info (if applicable)
const { Connection, PublicKey } = require('@solana/web3.js');

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

// List of contract addresses (from ALL_CONTRACT_ADDRESSES.md)
const CONTRACT_ADDRESSES = [
  'EAy5Nfn6fhs4ixC4sMcKQYQaoedLokpWqbfDtWURCnk6', // BOT1
  'HUwjG8LFabw28vJsQNoLXjxuzgdLhjGQw1DHZggzt76', // BOT2
  'FZxmYkA6axyK3Njh3YNWXtybw9GgniVrXowS1pAAyrD1', // BOT3
  '5ynYfAM7KZZXwT4dd2cZQnYhFNy1LUysE8m7Lxzjzh2p', // BOT4
  'DHBDPUkLLYCRAiyrgFBgvWfevquFkLR1TjGXKD4M4JPD'  // BOT5
];

async function printAccountDetails(address) {
  const pubkey = new PublicKey(address);
  const accountInfo = await connection.getAccountInfo(pubkey);
  console.log(`\n=== Contract Address: ${address} ===`);
  if (accountInfo) {
    console.log('Lamports:', accountInfo.lamports);
    console.log('Owner:', accountInfo.owner.toBase58());
    console.log('Executable:', accountInfo.executable);
    // Print first 32 bytes of data as base64
    console.log('Data (base64, first 32 bytes):', accountInfo.data.toString('base64').slice(0, 44));
  } else {
    console.log('No account found.');
    return;
  }
  // Fetch recent transactions (signatures)
  try {
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 5 });
    if (signatures.length > 0) {
      console.log('Recent Transactions:');
      signatures.forEach(sig => console.log(`  - ${sig.signature}`));
    } else {
      console.log('No recent transactions.');
    }
  } catch (err) {
    console.log('Error fetching transactions:', err.message);
  }
}

async function main() {
  for (const address of CONTRACT_ADDRESSES) {
    await printAccountDetails(address);
  }
}

main();
