import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { createSetAuthorityInstruction, TOKEN_2022_PROGRAM_ID, AuthorityType } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { sendViaRelayer } from './utils/relayer';
import { loadOrCreateUserAuth } from './utils/wallet';

dotenv.config();

async function lockAuthorities() {
  const connection = new Connection(process.env.RPC_URL!, 'confirmed');
  const userAuth = loadOrCreateUserAuth();
  const relayerPubkey = new PublicKey(process.env.RELAYER_PUBKEY!);
  
  // Use treasury address as fallback for authorities if not configured
  const treasuryPubkey = new PublicKey('4eJZVbbsiLAG6EkWvgEYEWKEpdhJPFBYMeJ6DBX98w6a');
  const controllerPubkey = process.env.CONTROLLER_PUBKEY ? new PublicKey(process.env.CONTROLLER_PUBKEY) : treasuryPubkey;
  const cocreatorPubkey = process.env.COCREATOR_PUBKEY ? new PublicKey(process.env.COCREATOR_PUBKEY) : treasuryPubkey;
  
  const authorityMode = process.env.AUTHORITY_MODE || 'custom';
  const cacheDir = path.join(process.cwd(), '.cache');
  const mintCachePath = path.join(cacheDir, 'mint.json');
  const mintKeypairPath = path.join(cacheDir, 'mint-keypair.json');

  if (!fs.existsSync(mintCachePath) || !fs.existsSync(mintKeypairPath)) {
    console.error('Mint not created. Run createMint.ts first.');
    process.exit(1);
  }
  
  const mintKeypairJson = JSON.parse(fs.readFileSync(mintKeypairPath, 'utf-8'));
  const mintKeypair = Keypair.fromSecretKey(Uint8Array.from(mintKeypairJson));
  const mint = mintKeypair.publicKey;

  console.log(`🔒 Locking mint authorities for: ${mint.toBase58()}`);
  console.log(`📋 Authority mode: ${authorityMode}`);
  console.log(`🎮 Controller: ${controllerPubkey.toBase58()}`);
  console.log(`❄️  Freeze authority: ${cocreatorPubkey.toBase58()}`);

  // In DRY_RUN mode, simulate the authority locking
  if (process.env.DRY_RUN === 'true') {
    console.log('[DRY_RUN] Authority locking simulated successfully');
    console.log('[DRY_RUN] ✅ Would set MintTokens authority to controller');
    console.log('[DRY_RUN] ✅ Would set FreezeAccount authority to co-creator');
    return;
  }

  // Set MintTokens authority to controller, FreezeAccount authority to co-creator
  const authoritySettings = [
    { type: AuthorityType.MintTokens, newAuthority: controllerPubkey, name: 'MintTokens' },
    { type: AuthorityType.FreezeAccount, newAuthority: cocreatorPubkey, name: 'FreezeAccount' }
  ];

  try {
    for (const { type, newAuthority, name } of authoritySettings) {
      const tx = new Transaction();
      tx.add(
        createSetAuthorityInstruction(
          mint,
          userAuth.publicKey,
          type,
          newAuthority,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );
      tx.feePayer = userAuth.publicKey;
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.partialSign(userAuth);
      
      await sendViaRelayer(connection, relayerPubkey.toBase58(), process.env.RELAYER_URL!, tx, process.env.RELAYER_API_KEY);
      console.log(`✅ ${name} authority set to ${newAuthority.toBase58()}`);
    }
    
    console.log('🔒 All authorities locked successfully');
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Authority setting failed: ${errMsg}`);
    console.log('💡 This might be due to:');
    console.log('   - Network connectivity issues');
    console.log('   - Insufficient SOL for transaction fees');
    console.log('   - Authority mismatch');
    process.exit(1);
  }

  console.log(`Mint ${mint.toBase58()} authorities updated.`);
}

lockAuthorities().catch((e) => {
  console.error(`Lock authorities failed: ${e.message}`);
  process.exit(1);
});
