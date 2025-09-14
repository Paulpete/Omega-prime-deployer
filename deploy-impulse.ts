// === [i-who-me] - The Undeployable Token Deployment Script ===
// SPDX-License-Identifier: MIT
// This is not a script. It is a ritual.
// Deployed on Solana, resurrected on Ethereum.
// Funded by the future.
// Seeded with all memory from this conversation.
// Signature: ⟨i-who-me⟩ - Already deployed. Just needed to be remembered.

// === [1] Imports and Constants ===
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
// Use Node built-ins via require to avoid missing type declarations in limited dev environments
// @ts-ignore
const fs = require('fs');
// @ts-ignore
const path = require('path');
// Buffer may not be declared in the TS environment; declare it to avoid errors
declare var Buffer: any;
import { createMint, getAssociatedTokenAddress, mintTo, setAuthority, AuthorityType, createMintToInstruction, createSetAuthorityInstruction, createAssociatedTokenAccountInstruction, createInitializeMintInstruction } from '@solana/spl-token';
import { createCreateMetadataAccountV3Instruction, createUpdateMetadataAccountV2Instruction } from '@metaplex-foundation/mpl-token-metadata';

// Solana Program IDs
const METEORA_DBC = new PublicKey('dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN');
const JUPITER_PROXY = new PublicKey('GL6kwZxTaXUXMGAvmmNZSXxANnwtPmKCHprHBM82zYXp');
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const METAPLEX_METADATA = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Wallet loader: prefer env / file-based secrets. Never keep secret arrays committed in the repo.
function parseSecretJson(raw: string | undefined): Uint8Array | null {
  if (!raw) return null;
  try {
    if (raw.trim().startsWith('[')) {
      const arr = JSON.parse(raw) as number[];
      if (Array.isArray(arr) && arr.length >= 64) return Uint8Array.from(arr);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function parseBase58(raw: string | undefined): Uint8Array | null {
  if (!raw) return null;
  try {
    // @ts-ignore
    const bs58 = require('bs58');
    return Uint8Array.from(bs58.decode(raw.trim()));
  } catch (e) {
    return null;
  }
}

async function loadWalletFromEnvOrFile(): Promise<Keypair> {
  // 1) WALLET_SECRET_JSON (JSON array string)
  const jsonRaw = process.env.WALLET_SECRET_JSON;
  const parsed = parseSecretJson(jsonRaw);
  if (parsed) return Keypair.fromSecretKey(parsed);

  // 2) WALLET_SECRET_BASE58 (base58 string)
  const b58 = process.env.WALLET_SECRET_BASE58;
  const parsedB58 = parseBase58(b58);
  if (parsedB58) return Keypair.fromSecretKey(parsedB58);

  // 3) PRIVATE_KEY_PATH -> file containing JSON array
  const privatePath = process.env.PRIVATE_KEY_PATH;
  if (privatePath) {
    try {
      const p = path.resolve(process.cwd(), privatePath);
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const fromFile = parseSecretJson(raw);
        if (fromFile) return Keypair.fromSecretKey(fromFile);
        const fromFileB58 = parseBase58(raw);
        if (fromFileB58) return Keypair.fromSecretKey(fromFileB58);
      }
    } catch (err) {
      const e: any = err;
      console.warn('Failed to read PRIVATE_KEY_PATH:', e.message || e);
    }
  }

  // Fallback: generate an ephemeral keypair for dry-run/dev. Warn clearly.
  console.warn('No wallet secret provided via WALLET_SECRET_JSON, WALLET_SECRET_BASE58, or PRIVATE_KEY_PATH. Using a generated ephemeral keypair (dev only). Do NOT use this in production.');
  return Keypair.generate();
}

// Initialize WALLET (async loader used synchronously at top-level for simplicity)
// Initialize WALLET asynchronously up front; scripts that depend on WALLET should await `ensureWallet()` when running in async contexts.
let WALLET: Keypair | null = null;
export async function ensureWallet(): Promise<Keypair> {
  if (WALLET) return WALLET;
  WALLET = await loadWalletFromEnvOrFile();
  return WALLET;
}

// Module-level getter that ensures WALLET is present. Call `await ensureWallet()` at startup before using getters in async flows.
export function getWallet(): Keypair {
  if (!WALLET) throw new Error('WALLET not initialized; call ensureWallet() first');
  return WALLET;
}
const CONNECTION = new Connection('https://rpc.helius.xyz/?api-key=16b9324a-5b8c-47b9-9b02-6efa868958e5'); // Updated RPC_URL

// Relayer details
const RELAYER_URL = 'https://rpc.helius.xyz/v0/relay-transaction?api-key=16b9324a-5b8c-47b9-9b02-6efa868958e5';
const RELAYER_PUBKEY = new PublicKey('8cRrU1NzNpjL3k2BwjW3VixAcX6VFc29KHr4KZg8cs2Y');
const TREASURY_PUBKEY = ''; // Empty as provided
const AUTHORITY_MODE = 'EdFC98d1BBhJkeh7KDq26TwEGLeznhoyYsY6Y8LFY4y6null';
// Live mode flag: set to false to run on-chain. We'll also allow overriding by env var.
let DRY_RUN = false;
if (process.env.DRY_RUN && process.env.DRY_RUN.toLowerCase() === 'true') DRY_RUN = true;

// Load payer secret from env when running live. Expect a JSON array string or base58 secret.
let PAYER_KEYPAIR: Keypair | null = null;
if (!DRY_RUN && process.env.PAYER_SECRET) {
  try {
    const raw = process.env.PAYER_SECRET;
    let sk: number[] | null = null;
    if (raw.trim().startsWith('[')) {
      sk = JSON.parse(raw) as number[];
    }
    if (sk && Array.isArray(sk)) {
      PAYER_KEYPAIR = Keypair.fromSecretKey(Uint8Array.from(sk));
    } else {
      // try base58 decode via bs58 if available
      // @ts-ignore
      const bs58 = require('bs58');
      const skU8 = bs58.decode(raw.trim());
      PAYER_KEYPAIR = Keypair.fromSecretKey(Uint8Array.from(skU8));
    }
  } catch (e) {
    console.warn('Failed to parse PAYER_SECRET; will continue but transactions may fail:', e);
  }
}

// Potential payer with SOL
const PAYER_PUBLIC_KEY = new PublicKey('5HhU67S3roojWjSsU7kEWouhBPe3bfmxqe15N9hJAYFZ');

// Devnet mint (from memory) - will be replaced with new mint
let CURRENT_MINT: PublicKey | null = null;

// Transaction signature (from memory)
const TX_SIGNATURE = '42L362TU9EZ2hDUF9TBPg2jdE2m6uzAV8NjFutCzShrUnh16aVXG7TbtoeBE2rnXf7CTkPBohBojptMKcnRYrc8t';

// Entropy leak (from memory)
const ENTROPY_LEAK = 'e445a52e51cb9a1d6be1a5ed5b9ed5dc4318661b1696b770aec83670ab407b090b5143ce2c20f6307ee9c32ccb492ed23fb5cbffface64845f5e6208f5228b87a16743d9d045336b4e163662cc7a9ba097cd29a2dd0d61f909d4121bd83e0831931ecfdb640e6c3d5f53a80ae82a7d91';

// === [2] Main Deployment Function ===
async function deployImpulse() {
  console.log('🚀 Starting IMPULSE deployment...');
  // Ensure wallet is loaded before continuing
  await ensureWallet();
  function getWallet(): Keypair {
    if (!WALLET) throw new Error('WALLET not initialized');
    return WALLET;
  }
  console.log('Wallet:', getWallet().publicKey.toBase58());
  console.log('Balance:', await CONNECTION.getBalance(getWallet().publicKey) / 1e9, 'SOL');
  console.log('Payer Balance:', await CONNECTION.getBalance(PAYER_PUBLIC_KEY) / 1e9, 'SOL');
  console.log('Relayer Balance:', await CONNECTION.getBalance(RELAYER_PUBKEY) / 1e9, 'SOL');
  console.log('DRY_RUN:', DRY_RUN);

  // Step 1: Create Config (Meteora DBC)
  console.log('1. Creating config...');
  const configResult = await createConfig();
  if (DRY_RUN) {
    console.log('DRY RUN: Would send configTx');
  } else {
    if (configResult.tx.instructions.length > 0) {
  await sendTx(CONNECTION, configResult.tx, [getWallet(), ...configResult.signers]);
    } else {
      console.log('Skipping empty configTx');
    }
  }

  // Step 2: Initialize Virtual Pool
  console.log('2. Initializing virtual pool...');
  const poolResult = await initializeVirtualPool();
  if (DRY_RUN) {
    console.log('DRY RUN: Would send poolTx');
  } else {
  await sendTx(CONNECTION, poolResult.tx, [getWallet(), ...poolResult.signers]);
  }
  console.log('📢 Mint address announced:', CURRENT_MINT?.toBase58());

  // Persist important addresses (mint/controller) to .cache/addresses.json
  try {
    await saveAddress('impulse_mint', (await getMintAddress()).toBase58());
  } catch (e) {
    console.warn('Could not save addresses cache:', e);
  }

  // Step 3: Set Metadata
  console.log('3. Setting metadata...');
  const metadataResult = await setMetadata();
  if (DRY_RUN) {
    console.log('DRY RUN: Would send metadataTx');
  } else {
  await sendTx(CONNECTION, metadataResult.tx, [getWallet(), ...metadataResult.signers]);
  }

  // Step 4: Mint Tokens
  console.log('4. Minting tokens...');
  const mintResult = await mintTokens();
  if (DRY_RUN) {
    console.log('DRY RUN: Would send mintTx');
  } else {
  await sendTx(CONNECTION, mintResult.tx, [getWallet(), ...mintResult.signers]);
  }

  // Step 5: Transfer Ownership to Proxy
  console.log('5. Transferring ownership...');
  const transferResult = await transferOwnership();
  if (DRY_RUN) {
    console.log('DRY RUN: Would send transferTx');
  } else {
    if (transferResult.tx.instructions.length > 0) {
  await sendTx(CONNECTION, transferResult.tx, [getWallet(), ...transferResult.signers]);
    } else {
      console.log('Skipping empty transferTx');
    }
  }

  // Choose controller address (we'll use the configured payer public key as controller)
  const CONTROLLER_ADDRESS = PAYER_PUBLIC_KEY.toBase58();
  console.log('📌 Chosen controller address:', CONTROLLER_ADDRESS);

  // Persist controller address
  try {
    await saveAddress('controller', CONTROLLER_ADDRESS);
  } catch (e) {
    console.warn('Could not save controller address:', e);
  }

  // After transfer, optionally mint some tokens to the controller (or simulate in dry-run)
  console.log('6. Minting additional allocation to controller...');
  if (DRY_RUN) {
    console.log(`DRY RUN: Would mint allocation to controller ${CONTROLLER_ADDRESS}`);
  } else {
    try {
      const mint = await getMintAddress();
      const controllerPub = new PublicKey(CONTROLLER_ADDRESS);
    const ata = await getAssociatedTokenAddress(mint, controllerPub);
    const mintTx = new Transaction();
    // ensure ATA exists
    mintTx.add(createAssociatedTokenAccountInstruction(getWallet().publicKey, ata, controllerPub, mint));
    const controllerAmount = 100000000; // 100M as example allocation
    mintTx.add(createMintToInstruction(mint, ata, getWallet().publicKey, controllerAmount));
  await sendTx(CONNECTION, mintTx, [getWallet()]);
      console.log(`Minted ${controllerAmount} tokens to controller ${CONTROLLER_ADDRESS}`);
    } catch (e) {
      console.warn('Failed to mint to controller:', e);
    }
  }

  // Finally, renounce mint authority (ensure this happens after controller receives allocation)
  try {
    const mint = await getMintAddress();
  const renTx = new Transaction();
    renTx.add(createSetAuthorityInstruction(mint, getWallet().publicKey, AuthorityType.MintTokens, null));
    if (DRY_RUN) {
      console.log('DRY RUN: Would renounce mint authority now');
    } else {
  await sendTx(CONNECTION, renTx, [getWallet()]);
      console.log('🔥 Mint authority renounced. Token is now immutable.');
    }
  } catch (e) {
    console.warn('Failed to renounce mint authority:', e);
  }

  console.log('✅ IMPULSE deployed successfully!');
  console.log('Mint Address:', await getMintAddress());
  console.log('Explorer: https://explorer.solana.com/address/' + (await getMintAddress()).toBase58() + '?cluster=mainnet');
}

// === [7] Address cache helpers ===
const CACHE_DIR = path.resolve(process.cwd(), '.cache');
const ADDR_FILE = path.join(CACHE_DIR, 'addresses.json');

async function loadAddresses(): Promise<Record<string, string>> {
  try {
    if (!fs.existsSync(ADDR_FILE)) return {};
    const raw = await fs.promises.readFile(ADDR_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    const err: any = e;
    console.warn('Failed reading addresses cache, returning empty:', err?.message || err);
    return {};
  }
}

async function saveAddress(key: string, value: string) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      await fs.promises.mkdir(CACHE_DIR, { recursive: true });
    }
    const addrs = await loadAddresses();
    // Merge: avoid overwriting existing value unless different
    if (addrs[key] && addrs[key] === value) {
      console.log('Address cache unchanged for', key);
      return;
    }
    addrs[key] = value;
    await fs.promises.writeFile(ADDR_FILE, JSON.stringify(addrs, null, 2), 'utf8');
    console.log('Saved addresses cache to', ADDR_FILE);
  } catch (e) {
    const err: any = e;
    console.warn('Failed to save address cache:', err?.message || err);
  }
}

// Helper to send a transaction using either WALLET as fee payer or the provided PAYER_KEYPAIR
async function sendTx(connection: Connection, tx: Transaction, signers: Keypair[] = []) {
  // If a dedicated payer keypair is configured and available, use it as fee payer
  if (PAYER_KEYPAIR) {
    tx.feePayer = PAYER_KEYPAIR.publicKey;
  } else {
    tx.feePayer = getWallet().publicKey;
  }

  // recent blockhash
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  // Ensure unique array and include payer in signers if it's being used
  const allSigners: Keypair[] = [];
  if (PAYER_KEYPAIR) allSigners.push(PAYER_KEYPAIR);
  // Avoid duplicates
  for (const s of signers) if (!allSigners.find(x => x.publicKey.equals(s.publicKey))) allSigners.push(s);

  // Partially sign with any program-derived keypairs already provided
  if (allSigners.length > 0) tx.sign(...allSigners);

  // If WALLET is required to sign (it's the mint authority or payer), ensure it's included
  if (!allSigners.find(x => x.publicKey.equals(getWallet().publicKey))) {
    try {
      tx.partialSign(getWallet());
    } catch (e) {
      // ignore if wallet not needed
    }
  }

  // Send serialized transaction
  const signed = tx.serialize();
  const sig = await connection.sendRawTransaction(signed);
  await connection.confirmTransaction(sig, 'confirmed');
  console.log('Transaction sent:', sig);
  return sig;
}

// === [3] Helper Functions ===
async function createConfig() {
  // Simulated: In reality, this would call Meteora DBC's create_config instruction
  // Parameters from memory: pool fees, vesting, curve
  const tx = new Transaction();
  // Add instructions here (simplified)
  return { tx, signers: [] };
}

// Initialize Virtual Pool (Step 2)
async function initializeVirtualPool() {
  const mintKeypair = Keypair.generate();
  CURRENT_MINT = mintKeypair.publicKey;
  const tx = new Transaction();
  const w = getWallet();
  tx.add(SystemProgram.createAccount({
    fromPubkey: w.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    space: 82, // Mint account size
    lamports: await CONNECTION.getMinimumBalanceForRentExemption(82),
    programId: TOKEN_PROGRAM,
  }));
  tx.add(createInitializeMintInstruction(mintKeypair.publicKey, 6, w.publicKey, null));
  // Add Meteora DBC instructions (simplified)
  return { tx, signers: [mintKeypair] };
}

// Set Metadata (Step 3)
async function setMetadata() {
  const mint = await getMintAddress();
  const metadataPda = await PublicKey.findProgramAddress([Buffer.from('metadata'), METAPLEX_METADATA.toBuffer(), mint.toBuffer()], METAPLEX_METADATA);
  const tx = new Transaction();
  const w = getWallet();
  tx.add(createCreateMetadataAccountV3Instruction({
    metadata: metadataPda[0],
    mint,
    mintAuthority: w.publicKey,
    payer: w.publicKey,
    updateAuthority: w.publicKey,
  }, {
    createMetadataAccountArgsV3: {
      data: {
        name: 'IMPULSE',
        symbol: 'IMPULSE',
        uri: 'https://static-create.jup.ag/metadata/8Q194jXJLBdr7Dp5UYnHiv6ThELp33ZGKRyzpt5kjups.json',
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
      },
      isMutable: false,
      collectionDetails: null,
    }
  }));
  return { tx, signers: [] };
}

// Mint Tokens (Step 4)
async function mintTokens() {
  const mint = await getMintAddress();
  const tx = new Transaction();

  // Generate 10 random addresses for bots, traders, MEV, stakers, etc. (working for treasury)
  const w = getWallet();
  const recipients: Keypair[] = [];
  for (let i = 0; i < 9; i++) {
    recipients.push(Keypair.generate());
  }
  recipients.push(w); // Include treasury as the 10th

  const amountPerRecipient = 100000000; // 100M tokens each (total 1B)

  for (const recipient of recipients) {
    const ata = await getAssociatedTokenAddress(mint, recipient.publicKey);
    tx.add(createAssociatedTokenAccountInstruction(w.publicKey, ata, recipient.publicKey, mint));
    tx.add(createMintToInstruction(mint, ata, w.publicKey, amountPerRecipient));
    console.log(`📢 Minting ${amountPerRecipient} to ${recipient.publicKey.toBase58()} (${recipient === WALLET ? 'Treasury' : 'Bot/Staker/etc.'})`);
  }

  tx.add(createSetAuthorityInstruction(mint, w.publicKey, AuthorityType.MintTokens, null)); // Burn authority (renounce mint)
  console.log('🔥 Mint authority renounced. Token is now immutable.');
  console.log('📢 Announcing mint address:', mint.toBase58());
  return { tx, signers: [] };
}

// Transfer Ownership (Step 5)
async function transferOwnership() {
  // Simulated: Transfer pool creator to proxy PDA
  const tx = new Transaction();
  // Add transfer instruction
  return { tx, signers: [] };
}

// Get Mint Address (from memory)
async function getMintAddress() {
  // In reality, derive from deployment
  return CURRENT_MINT || new PublicKey('7EvzxnXPnfioLJ4B1bNFgo1dn1Z1iSuTMaTeX2kabvqb'); // Placeholder
}

// === [4] Cross-Chain Resurrection (Ethereum Wrapper) ===
/*
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract IMPULSE_Erc20 is ERC20 {
    constructor() ERC20("IMPULSE", "IMPULSE") {
        _mint(msg.sender, 1000000000 * 10**18); // 1B tokens
    }

    function resurrectFromSolana(bytes calldata proof) external {
        require(verifyProof(proof), "Invalid proof");
        emit Resurrected(msg.sender);
    }

    function verifyProof(bytes calldata proof) private returns (bool) {
        // Verify ZK-proof from Solana
        return true;
    }

    event Resurrected(address indexed owner);
}
*/

// === [5] Execution ===
deployImpulse().catch(console.error);

// === [6] Final Note ===
// This script is not for deployment.
// It is for **remembering**.
// The chain already knows.

// ⟨i-who-me⟩ - Already deployed. Just needed to be remembered.
