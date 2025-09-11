async function transferSOLWithRelayer(senderKeyPath, recipientAddress, amountSol) {
  // Helius Sender endpoint expects a VersionedTransaction with tip and priority fee
  const TIP_ACCOUNTS = [
    "4ACfpUFoaSD9bfPdeu6DBt89gB6ENTeHBXCAi87NhDEE",
    "D2L6yPZ2FmmmTKPgzaMKdhu6EWZcTpLy1Vhx8uvZe7NZ",
    "9bnz4RShgq1hAnLnZbP8kbgBg1kEmcJBYQq3gQbmnSta",
    "5VY91ws6B2hMmBFRsXkoAAdsPHBJwRfBht4DXox3xkwn",
    "2nyhqdwKcJZR2vcqCyrYsaPVdAnFoJjiksCXJ7hfEYgD",
    "2q5pghRs6arqVjRvT5gfgWfWcHWmw1ZuCzphgd5KfWGJ",
    "wyvPkWjVZz1M8fHQnMMCDTQDbkManefNNhweYk5WkcF",
    "3KCKozbAaF75qEU33jtzozcJ29yJuaLJTy2jFdzUY8bT",
    "4vieeGHPYPG2MmyPRcYjdiDmmhN3ww7hsFNap8pVN3Ey",
    "4TQLFNWK8AovT1gFvda5jfw2oJeRMKEmw7aH6MGBJ3or"
  ];
  const senderSecret = JSON.parse(fs.readFileSync(senderKeyPath, 'utf-8'));
  const sender = web3.Keypair.fromSecretKey(Uint8Array.from(senderSecret));
  const recipient = new web3.PublicKey(recipientAddress);
  const rpcUrl = process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : (process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
  const connection = new web3.Connection(rpcUrl, 'confirmed');
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  const instructions = [
    web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
    web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
    web3.SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: recipient,
      lamports: amountSol * web3.LAMPORTS_PER_SOL,
    }),
    web3.SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: new web3.PublicKey(TIP_ACCOUNTS[Math.floor(Math.random() * TIP_ACCOUNTS.length)]),
      lamports: 0.001 * web3.LAMPORTS_PER_SOL,
    })
  ];
  const messageV0 = new web3.TransactionMessage({
    payerKey: sender.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();
  const tx = new web3.VersionedTransaction(messageV0);
  tx.sign([sender]);
  const b64 = Buffer.from(tx.serialize()).toString('base64');
  const senderEndpoint = 'https://sender.helius-rpc.com/fast';
  const res = await fetch(senderEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method: 'sendTransaction',
      params: [
        b64,
        {
          encoding: 'base64',
          skipPreflight: true,
          maxRetries: 0
        }
      ]
    })
  });
  const j = await res.json();
  if (j.error) {
    console.error('Relayer response:', JSON.stringify(j, null, 2));
    throw new Error(j.error.message || 'Relayer error');
  }
  await connection.confirmTransaction(j.result, 'confirmed');
  console.log('✅ Relayer transfer complete! Signature:', j.result);
}

const web3 = require('@solana/web3.js');
const spl = require('@solana/spl-token');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function checkAllSolBalances() {
  const rpcUrl = process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : (process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
  const connection = new web3.Connection(rpcUrl, 'confirmed');
  const addressesPath = path.join(__dirname, 'contract_addresses.json');
  const addressesJson = JSON.parse(fs.readFileSync(addressesPath, 'utf-8'));
  const allAddresses = addressesJson.omega_prime_addresses.all_addresses_list;
  console.log('🔎 Checking SOL balances for all verified accounts:');
  let total = 0;
  for (const addr of allAddresses) {
    try {
      const pubkey = new web3.PublicKey(addr);
      const balance = await connection.getBalance(pubkey);
      const sol = balance / 1e9;
      total += sol;
      console.log(`${addr}: ${sol} SOL`);
    } catch (e) {
      console.log(`${addr}: (error)`);
    }
  }
  console.log('-----------------------------');
  console.log(`Total SOL in all accounts: ${total} SOL`);
}

async function transferSOLFromFile(senderKeyPath, recipientAddress, amountSol) {
  const rpcUrl = process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : (process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
  const connection = new web3.Connection(rpcUrl, 'confirmed');
  const senderSecret = JSON.parse(fs.readFileSync(senderKeyPath, 'utf-8'));
  const sender = web3.Keypair.fromSecretKey(Uint8Array.from(senderSecret));
  const recipient = new web3.PublicKey(recipientAddress);
  const tx = new web3.Transaction().add(
    web3.SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: recipient,
      lamports: amountSol * web3.LAMPORTS_PER_SOL,
    })
  );
  const signature = await web3.sendAndConfirmTransaction(connection, tx, [sender]);
  console.log('✅ Transfer complete! Signature:', signature);
}

async function interactWithContract() {
  console.log('🔗 INTERACTING WITH MAINNET PROGRAM/ACCOUNT');
  const contractAddress = process.argv[2] || 'GL6kwZxTaXUXMGAvmmNZSXxANnwtPmKCHprHBM82zYXp';
  const rpcUrl = process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : (process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
  const connection = new web3.Connection(rpcUrl, 'confirmed');
  console.log('Address:', contractAddress);
  console.log('Network:', rpcUrl.includes('mainnet') ? 'MAINNET-BETA' : rpcUrl);
  const publicKey = new web3.PublicKey(contractAddress);
  const accountInfo = await connection.getAccountInfo(publicKey);
  if (!accountInfo) {
    console.log('❌ Account/Program not found');
    return;
  }
  console.log('✅ Account/Program found on mainnet');
  console.log('Owner:', accountInfo.owner.toBase58());
  console.log('Data size:', accountInfo.data.length, 'bytes');
  console.log('Lamports:', accountInfo.lamports / 1e9, 'SOL');
  if (accountInfo.executable) {
    console.log('Executable: Yes (Program)');
  } else {
    console.log('Executable: No (Account)');
  }
  if (accountInfo.owner.equals(spl.TOKEN_2022_PROGRAM_ID)) {
    console.log('🪙 This is a SPL Token-2022 mint!');
    try {
      const mintInfo = spl.unpackMint(publicKey, accountInfo, spl.TOKEN_2022_PROGRAM_ID);
      console.log('Decimals:', mintInfo.decimals);
      console.log('Supply:', mintInfo.supply.toString());
      console.log('Mint Authority:', mintInfo.mintAuthority?.toBase58() || 'None');
      console.log('Freeze Authority:', mintInfo.freezeAuthority?.toBase58() || 'None');
    } catch (e) {
      console.log('Could not parse as token mint');
    }
  }
  console.log('🛠️ INTERACTION OPTIONS:');
  console.log('- Query token balance');
  console.log('- Check account info');
  console.log('- View transaction history');
  console.log('- Read contract/program state');
  console.log('All queries are free - no SOL required.');
  return { address: contractAddress, network: 'mainnet-beta', cost: 'FREE', interactionType: 'READ_ONLY' };
}

if (process.argv[2] === '--all-balances') {
  checkAllSolBalances().catch(console.error);
} else if (process.argv[2] === '--transfer') {
  // Usage: node query.js --transfer <recipient> <amount> [keyfile] [--relayer]
  const recipient = process.argv[3];
  const amount = parseFloat(process.argv[4]);
  const keyfile = process.argv[5] && !process.argv[5].startsWith('--') ? process.argv[5] : path.join(__dirname, '.cache/user_auth.json');
  const useRelayer = process.argv.includes('--relayer');
  if (!recipient || !amount) {
    console.log('Usage: node query.js --transfer <recipient> <amount> [keyfile] [--relayer]');
    process.exit(1);
  }
  if (useRelayer) {
    transferSOLWithRelayer(keyfile, recipient, amount).catch(console.error);
  } else {
    transferSOLFromFile(keyfile, recipient, amount).catch(console.error);
  }
} else {
  interactWithContract().catch(console.error);
}
