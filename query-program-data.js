// Query Solana program data for all core and DEX program IDs
const { Connection, PublicKey } = require('@solana/web3.js');

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

// List of program IDs (core and DEX)
const PROGRAM_IDS = [
  // Core Programs
  'Stake11111111111111111111111111111111111111',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  // DEX & Trading Programs
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'
];

async function printProgramDetails(address) {
  const pubkey = new PublicKey(address);
  const accountInfo = await connection.getAccountInfo(pubkey);
  console.log(`\n=== Program ID: ${address} ===`);
  if (accountInfo) {
    console.log('Lamports:', accountInfo.lamports);
    console.log('Owner:', accountInfo.owner.toBase58());
    console.log('Executable:', accountInfo.executable);
    console.log('Data length:', accountInfo.data.length);
    // Print first 32 bytes of data as base64
    console.log('Data (base64, first 32 bytes):', accountInfo.data.toString('base64').slice(0, 44));
  } else {
    console.log('No account found.');
  }
}

async function main() {
  for (const address of PROGRAM_IDS) {
    await printProgramDetails(address);
  }
}

main();
