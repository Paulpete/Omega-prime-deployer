import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { createInitializeMintInstruction, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

import { sendViaRelayer } from './utils/relayer';
import { loadOrCreateUserAuth } from './utils/wallet';

const retries = 10;

dotenv.config();

async function createTokenMintWithRetry() {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = new Connection(process.env.RPC_URL!, 'confirmed');
      const userAuth = loadOrCreateUserAuth();
      const relayerPubkey = new PublicKey(process.env.RELAYER_PUBKEY!);
      const cacheDir = path.join(process.cwd(), '.cache');
      const mintCachePath = path.join(cacheDir, 'mint.json');
      process.env.TREASURY_PUBKEY = '4eJZVbbsiLAG6EkWvgEYEWKEpdhJPFBYMeJ6DBX98w6a';

      if (fs.existsSync(mintCachePath)) {
        let mint: string | undefined;
        try {
          const mintCacheRaw = fs.readFileSync(mintCachePath, 'utf-8');
          if (mintCacheRaw && mintCacheRaw.trim().length > 0) {
            const mintCache = JSON.parse(mintCacheRaw);
            if (typeof mintCache === 'string') {
              mint = mintCache;
              // Rewrite file to correct format
              fs.writeFileSync(mintCachePath, JSON.stringify({ mint }));
            } else if (mintCache && typeof mintCache.mint === 'string') {
              mint = mintCache.mint;
            }
          }
        } catch (err) {
          // If file is empty or invalid, ignore and proceed to create new mint
          console.warn('Mint cache missing or invalid, will create new mint. Details:', err);
        }
        if (mint) {
          const mintInfo = await connection.getAccountInfo(new PublicKey(mint));
          if (mintInfo) {
            console.log(`Mint already exists: ${mint}`);
            return new PublicKey(mint);
          }
        }
      }


      const mintKeypairPath = path.join(cacheDir, 'mint-keypair.json');
      let mintKeypair: Keypair | undefined;
      let mintAddress: PublicKey | undefined;
      try {
        if (fs.existsSync(mintKeypairPath)) {
          const mintKeypairRaw = fs.readFileSync(mintKeypairPath, 'utf-8');
          if (!mintKeypairRaw || mintKeypairRaw.trim().length === 0) {
            // If file is empty, treat as missing and generate new keypair
            mintKeypair = Keypair.generate();
            mintAddress = mintKeypair.publicKey;
            if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
            fs.writeFileSync(mintKeypairPath, JSON.stringify(Array.from(mintKeypair.secretKey)));
          } else {
            const mintKeypairJson = JSON.parse(mintKeypairRaw);
            if (!mintKeypairJson || !Array.isArray(mintKeypairJson) || mintKeypairJson.length !== 64) throw new Error('Invalid mint-keypair.json format or length');
            mintKeypair = Keypair.fromSecretKey(Uint8Array.from(mintKeypairJson));
            mintAddress = mintKeypair.publicKey;
          }
        } else {
          mintKeypair = Keypair.generate();
          mintAddress = mintKeypair.publicKey;
          if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
          fs.writeFileSync(mintKeypairPath, JSON.stringify(Array.from(mintKeypair.secretKey)));
        }
      } catch (err) {
        // If file is empty or invalid, treat as missing and generate new keypair
        console.warn('Mint keypair missing or invalid, will create new keypair. Details:', err);
        mintKeypair = Keypair.generate();
        mintAddress = mintKeypair.publicKey;
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(mintKeypairPath, JSON.stringify(Array.from(mintKeypair.secretKey)));
      }
      if (!mintKeypair || !mintAddress || !(mintAddress instanceof PublicKey)) {
        console.error('Mint keypair or address is undefined or invalid!');
        process.exit(1);
      }
      fs.writeFileSync(mintCachePath, JSON.stringify({ mint: mintKeypair.publicKey.toBase58() }));

      // Create mint account if it doesn't exist
      const mintInfo = await connection.getAccountInfo(mintAddress);
      const tx = new Transaction();
      let ownerPubkey: PublicKey, freezePubkey: PublicKey;
      try {
        ownerPubkey = new PublicKey(process.env.TREASURY_PUBKEY!);
        freezePubkey = new PublicKey(process.env.TREASURY_PUBKEY!);
      } catch (err) {
        console.error('Error constructing owner/freeze PublicKey:', err);
        process.exit(1);
      }
      if (!ownerPubkey || !freezePubkey || !(ownerPubkey instanceof PublicKey) || !(freezePubkey instanceof PublicKey)) {
        console.error('Owner or freeze authority PublicKey is undefined or invalid!');
        process.exit(1);
      }
      if (!mintInfo) {
        // Create the mint account
        const { SystemProgram } = await import('@solana/web3.js');
        const lamports = await connection.getMinimumBalanceForRentExemption(82);
        tx.add(SystemProgram.createAccount({
          fromPubkey: userAuth.publicKey,
          newAccountPubkey: mintAddress,
          space: 82,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID
        }));
        tx.add(
          createInitializeMintInstruction(
            mintAddress,
            9,
            ownerPubkey,
            freezePubkey,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      // Set fee payer and recent blockhash
      tx.feePayer = userAuth.publicKey;
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      // Sign with both userAuth (payer) and mintKeypair (mint authority)
      tx.partialSign(userAuth, mintKeypair);

      const signature = await sendViaRelayer(connection, relayerPubkey.toBase58(), process.env.RELAYER_URL!, tx, process.env.RELAYER_API_KEY);
      if (signature !== 'DRY_RUN_SIGNATURE') {
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(mintCachePath, JSON.stringify({ mint: mintKeypair.publicKey.toBase58() }));
      }
      console.log(`Created mint: ${mintKeypair.publicKey.toBase58()}`);

      // Mint initial supply to treasury
      const { createAssociatedTokenAccountInstruction, createMintToInstruction, getAssociatedTokenAddress } = await import('@solana/spl-token');
      const treasuryATA = await getAssociatedTokenAddress(mintAddress, ownerPubkey);
      const ataInfo = await connection.getAccountInfo(treasuryATA);
      const mintTx = new Transaction();
      if (!ataInfo) {
        mintTx.add(createAssociatedTokenAccountInstruction(
          userAuth.publicKey,
          treasuryATA,
          ownerPubkey,
          mintAddress,
          TOKEN_2022_PROGRAM_ID
        ));
      }
      mintTx.add(createMintToInstruction(
        mintAddress,
        treasuryATA,
        mintKeypair.publicKey,
        1_000_000_000_000, // Mint 1,000 tokens (decimals=9)
        [],
        TOKEN_2022_PROGRAM_ID
      ));
      mintTx.feePayer = userAuth.publicKey;
      const { blockhash: mintBlockhash } = await connection.getLatestBlockhash('confirmed');
      mintTx.recentBlockhash = mintBlockhash;
      mintTx.partialSign(userAuth, mintKeypair);
      const mintSignature = await sendViaRelayer(connection, relayerPubkey.toBase58(), process.env.RELAYER_URL!, mintTx, process.env.RELAYER_API_KEY);
      if (mintSignature !== 'DRY_RUN_SIGNATURE') {
        console.log(`Minted initial supply to treasury: ${treasuryATA.toBase58()}`);
      }
      return mintKeypair.publicKey;
    } catch (e) { console.log('Error details:', e);
  const errMsg = e instanceof Error ? e.message : String(e);
  console.error(`Mint creation failed (attempt ${attempt}): ${errMsg}`);
      if (attempt === retries) {
        process.exit(1);
      }
    }
  }
}

createTokenMintWithRetry();
