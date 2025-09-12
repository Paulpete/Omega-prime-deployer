import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { createInitializeMintInstruction, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

import { sendViaRelayer, sendTransactionDirect } from './utils/relayer';
import { loadOrCreateUserAuth } from './utils/wallet';

const retries = 10;

dotenv.config();

async function createTokenMintWithRetry() {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = new Connection(process.env.RPC_URL!, 'confirmed');
      const userAuth = loadOrCreateUserAuth();
      const cacheDir = path.join(process.cwd(), '.cache');
      const mintCachePath = path.join(cacheDir, 'mint.json');
      
      // Use treasury from environment or fallback
      const treasuryAddress = process.env.TREASURY_PUBKEY || 'EdFC98d1BBhJkeh7KDq26TwEGLeznhoyYsY6Y8LFY4y6';

      if (fs.existsSync(mintCachePath)) {
        let mint: string | undefined;
        try {
          const cacheContent = fs.readFileSync(mintCachePath, 'utf-8').trim();
          if (cacheContent && cacheContent.length > 0) {
            const mintCache = JSON.parse(cacheContent);
            if (typeof mintCache === 'string') {
              mint = mintCache;
              // Rewrite file to correct format
              fs.writeFileSync(mintCachePath, JSON.stringify({ mint }));
            } else if (mintCache && typeof mintCache.mint === 'string') {
              mint = mintCache.mint;
            }
          }
        } catch (err) {
          console.log('Cache file exists but is invalid, will regenerate:', err instanceof Error ? err.message : String(err));
          // Delete invalid cache file
          fs.unlinkSync(mintCachePath);
        }
        if (mint) {
          try {
            // Skip account check in DRY_RUN mode to avoid network issues
            if (process.env.DRY_RUN !== 'true') {
              const mintInfo = await connection.getAccountInfo(new PublicKey(mint));
              if (mintInfo) {
                console.log(`Mint already exists: ${mint}`);
                return new PublicKey(mint);
              }
            } else {
              console.log(`[DRY_RUN] Assuming mint exists: ${mint}`);
              return new PublicKey(mint);
            }
          } catch (err) {
            console.log('Invalid mint address in cache, will regenerate:', mint);
            fs.unlinkSync(mintCachePath);
          }
        }
      }


      const mintKeypairPath = path.join(cacheDir, 'mint-keypair.json');
      let mintKeypair: Keypair | undefined;
      let mintAddress: PublicKey | undefined;
      try {
        if (fs.existsSync(mintKeypairPath)) {
          const mintKeypairRaw = fs.readFileSync(mintKeypairPath, 'utf-8').trim();
          if (!mintKeypairRaw || mintKeypairRaw.length === 0) {
            console.log('Mint keypair file is empty, generating new keypair');
            throw new Error('Empty keypair file');
          }
          const mintKeypairJson = JSON.parse(mintKeypairRaw);
          if (!mintKeypairJson || !Array.isArray(mintKeypairJson) || mintKeypairJson.length !== 64) {
            console.log('Invalid mint keypair format, generating new keypair');
            throw new Error('Invalid keypair format');
          }
          mintKeypair = Keypair.fromSecretKey(Uint8Array.from(mintKeypairJson));
          mintAddress = mintKeypair.publicKey;
          console.log('Loaded existing mint keypair:', mintAddress.toBase58());
        } else {
          throw new Error('Keypair file does not exist');
        }
      } catch (err) {
        console.log('Creating new mint keypair...');
        mintKeypair = Keypair.generate();
        mintAddress = mintKeypair.publicKey;
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(mintKeypairPath, JSON.stringify(Array.from(mintKeypair.secretKey)));
        console.log('Generated new mint keypair:', mintAddress.toBase58());
      }
      if (!mintKeypair || !mintAddress || !(mintAddress instanceof PublicKey)) {
        console.error('Mint keypair or address is undefined or invalid!');
        process.exit(1);
      }
      fs.writeFileSync(mintCachePath, JSON.stringify({ mint: mintKeypair.publicKey.toBase58() }));

      // In DRY_RUN mode, skip the actual transaction
      if (process.env.DRY_RUN === 'true') {
        console.log('[DRY_RUN] Mint creation simulated successfully');
        console.log(`[DRY_RUN] Created mint: ${mintKeypair.publicKey.toBase58()}`);
        console.log('[DRY_RUN] Cache files written');
        return mintKeypair.publicKey;
      }

      const tx = new Transaction();
      let ownerPubkey: PublicKey | undefined, freezePubkey: PublicKey | undefined;
      try {
        ownerPubkey = new PublicKey(treasuryAddress);
        freezePubkey = new PublicKey(treasuryAddress);
      } catch (err) {
        console.error('Error constructing owner/freeze PublicKey:', err);
        process.exit(1);
      }
      if (!ownerPubkey || !freezePubkey || !(ownerPubkey instanceof PublicKey) || !(freezePubkey instanceof PublicKey)) {
        console.error('Owner or freeze authority PublicKey is undefined or invalid!');
        process.exit(1);
      }
      tx.add(
        createInitializeMintInstruction(
          mintAddress,
          9,
          ownerPubkey,
          freezePubkey,
          TOKEN_2022_PROGRAM_ID
        )
      );

      // Determine transaction sending method
      const useRelayer = process.env.USE_RELAYER === 'true' && process.env.RELAYER_URL && process.env.RELAYER_PUBKEY;
      let signature: string;
      
      if (useRelayer) {
        console.log('Using relayer for no-cost transaction...');
        const relayerPubkey = new PublicKey(process.env.RELAYER_PUBKEY!);
        tx.feePayer = relayerPubkey;
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        
        // Sign only with mintKeypair; relayer will be fee payer and finalize
        tx.partialSign(mintKeypair);
        
        signature = await sendViaRelayer(
          connection, 
          relayerPubkey.toBase58(), 
          process.env.RELAYER_URL!, 
          tx, 
          process.env.RELAYER_API_KEY
        );
      } else {
        console.log('Using direct transaction sending (user pays fees)...');
        console.log(`Fee will be paid by: ${userAuth.publicKey.toBase58()}`);
        
        // Set fee payer and recent blockhash
        tx.feePayer = userAuth.publicKey;
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        
        // Send transaction directly
        signature = await sendTransactionDirect(connection, tx, [userAuth, mintKeypair]);
      }
      if (signature !== 'DRY_RUN_SIGNATURE') {
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(mintCachePath, JSON.stringify({ mint: mintKeypair.publicKey.toBase58() }));
      }
      console.log(`Created mint: ${mintKeypair.publicKey.toBase58()}`);
      return mintKeypair.publicKey;
    } catch (e) { 
      console.log('Error details:', e);
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error(`Mint creation failed (attempt ${attempt}): ${errMsg}`);
      
      // If it's a network error and we're not in the last attempt, just retry
      if ((errMsg.includes('fetch failed') || errMsg.includes('network')) && attempt < retries) {
        console.log(`Network error detected, retrying in ${attempt} seconds...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }
      
      if (attempt === retries) {
        console.error('Maximum retries reached. Consider:');
        console.error('1. Checking your network connection');
        console.error('2. Verifying the RPC URL in .env');
        console.error('3. Running in DRY_RUN=true mode for testing');
        process.exit(1);
      }
    }
  }
}

createTokenMintWithRetry();
