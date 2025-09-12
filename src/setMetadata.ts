import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createMetadataAccountV3, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata';
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const METADATA = {
  name: 'Omega Prime Token',
  symbol: 'ΩAGENT',
  description: 'Agent guild utility token powering Ω-Prime automations on Solana.',
  image: 'https://<hosted-image>/logo.png',
  external_url: 'https://<site>',
};

async function setTokenMetadata() {
  const cacheDir = path.join(process.cwd(), '.cache');
  const mintCachePath = path.join(cacheDir, 'mint.json');
  const userAuthPath = path.join(cacheDir, 'user_auth.json');

  if (!fs.existsSync(mintCachePath) || !fs.existsSync(userAuthPath)) {
    console.error('❌ Mint or user auth not found. Run mint creation first.');
    console.log('   Expected files:');
    console.log(`   - ${mintCachePath}`);
    console.log(`   - ${userAuthPath}`);
    process.exit(1);
  }

  let mintData: any;
  let userAuthJson: any;
  
  try {
    const mintContent = fs.readFileSync(mintCachePath, 'utf-8').trim();
    if (!mintContent) {
      console.error('❌ Mint cache file is empty. Run mint creation first.');
      process.exit(1);
    }
    mintData = JSON.parse(mintContent);
    
    const userAuthContent = fs.readFileSync(userAuthPath, 'utf-8').trim();
    if (!userAuthContent) {
      console.error('❌ User auth file is empty. Run mint creation first.');
      process.exit(1);
    }
    userAuthJson = JSON.parse(userAuthContent);
  } catch (error) {
    console.error('❌ Error reading cache files:', error instanceof Error ? error.message : String(error));
    console.log('   Please run mint creation first to generate valid cache files.');
    process.exit(1);
  }

  if (!mintData.mint) {
    console.error('❌ Invalid mint data format. Expected { mint: "..." }');
    process.exit(1);
  }
  
  const umi = createUmi(process.env.RPC_URL!);
  
  try {
    const userAuthKeypair = umi.eddsa.createKeypairFromSecretKey(Uint8Array.from(userAuthJson));
    umi.use(keypairIdentity(userAuthKeypair));
  } catch (error) {
    console.error('❌ Error creating UMI keypair:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
  
  const mint = publicKey(mintData.mint);
  const metadataPda = findMetadataPda(umi, { mint });

  const uri = `data:application/json;base64,${Buffer.from(JSON.stringify(METADATA)).toString('base64')}`;

  console.log(`🚀 Setting metadata for mint: ${mint}`);
  console.log(`📍 Metadata PDA: ${metadataPda[0]}`);
  console.log(`📄 URI length: ${uri.length} characters`);

  // In DRY_RUN mode, simulate the metadata setting
  if (process.env.DRY_RUN === 'true') {
    console.log('[DRY_RUN] Metadata setting simulated successfully');
    console.log(`[DRY_RUN] ✅ Metadata would be created for mint ${mint}`);
    console.log(`[DRY_RUN] 📍 Metadata PDA: ${metadataPda[0]}`);
    console.log(`[DRY_RUN] 🔗 URI: ${uri.slice(0, 100)}...`);
    return;
  }

  try {
    // Always try to create metadata - if it exists, the instruction will fail gracefully
    await createMetadataAccountV3(umi, {
      mint,
      mintAuthority: umi.identity,
      payer: umi.identity,
      updateAuthority: umi.identity,
      data: {
        name: METADATA.name,
        symbol: METADATA.symbol,
        uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
      },
      isMutable: true,
      collectionDetails: null,
    }).sendAndConfirm(umi);
    
    console.log(`✅ Metadata created for mint ${mint}`);
    console.log(`📍 Metadata PDA: ${metadataPda[0]}`);
    console.log(`🔗 URI: ${uri.slice(0, 100)}...`);
    
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    if (errMsg.includes('already exists') || errMsg.includes('Account already in use')) {
      console.log(`ℹ️  Metadata already exists for mint ${mint}`);
      console.log(`📍 Metadata PDA: ${metadataPda[0]}`);
    } else {
      console.error(`❌ Metadata setting failed: ${errMsg}`);
      console.log('💡 This might be due to:');
      console.log('   - Insufficient SOL for transaction fees');
      console.log('   - Authority mismatch');
      console.log('   - Network connectivity issues');
      process.exit(1);
    }
  }
}

setTokenMetadata().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
